import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LocationPointResponseDto } from './dto/location-ingest.dto';

interface AuthenticatedSocket extends Socket {
  user?: { sub: string; role: string };
  publicTripId?: string;
  tripId?: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, AuthenticatedSocket>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      try {
        const payload = this.jwtService.verify(token);
        client.user = { sub: payload.sub, role: payload.role };
      } catch {
        const trackingLink = await this.prisma.trackingLink.findUnique({
          where: { secureToken: token },
          select: { tripId: true, status: true, expiresAt: true },
        });

        if (
          !trackingLink ||
          trackingLink.status !== 'ACTIVE' ||
          trackingLink.expiresAt <= new Date()
        ) {
          client.disconnect();
          return;
        }

        client.publicTripId = trackingLink.tripId;
      }
      this.connectedClients.set(client.id, client);
      console.log(`Client connected: ${client.id} (${client.user?.role ?? 'PUBLIC_TRACKING'})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.tripId) {
      client.leave(`trip:${client.tripId}`);
    }
    this.connectedClients.delete(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinTrip')
  async handleJoinTrip(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { tripId: string }
  ) {
    if (!client.user && !client.publicTripId) {
      return { error: 'Not authenticated' };
    }

    if (client.publicTripId && client.publicTripId !== data.tripId) {
      return { error: 'Not authorized to join this trip' };
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: data.tripId },
      select: {
        id: true,
        driverAssignments: {
          where: { driverId: client.user?.sub },
          select: { driverId: true },
        },
        activeDriverId: true,
      },
    });

    if (!trip) {
      return { error: 'Trip not found' };
    }

    if (client.publicTripId) {
      client.tripId = data.tripId;
      client.join(`trip:${data.tripId}`);
      return { success: true };
    }

    if (!client.user) {
      return { error: 'Not authenticated' };
    }
    const isAssigned = trip.driverAssignments.some(a => a.driverId === client.user!.sub);
    const isActive = trip.activeDriverId === client.user.sub;
    const isAdmin = client.user.role === 'ADMIN' || client.user.role === 'SUPPORT';

    if (!isAssigned && !isActive && !isAdmin) {
      return { error: 'Not authorized to join this trip' };
    }

    client.tripId = data.tripId;
    client.join(`trip:${data.tripId}`);
    return { success: true };
  }

  @SubscribeMessage('leaveTrip')
  handleLeaveTrip(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.tripId) {
      client.leave(`trip:${client.tripId}`);
      client.tripId = undefined;
    }
    return { success: true };
  }

  broadcastLocationUpdate(tripId: string, location: LocationPointResponseDto) {
    this.server.to(`trip:${tripId}`).emit('locationUpdate', location);
  }

  broadcastTripStatusChange(tripId: string, status: string, activeDriverId: string | null) {
    this.server.to(`trip:${tripId}`).emit('tripStatusChange', { status, activeDriverId });
  }

  broadcastDriverHandover(tripId: string, previousDriverId: string, nextDriverId: string) {
    this.server.to(`trip:${tripId}`).emit('driverHandover', { previousDriverId, nextDriverId });
  }
}
