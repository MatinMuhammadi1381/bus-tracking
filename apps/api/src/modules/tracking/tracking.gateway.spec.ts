import { TrackingGateway } from './tracking.gateway';

describe('TrackingGateway public tracking authorization', () => {
  const createGateway = () => {
    const jwtService = {
      verify: jest.fn(),
    };
    const prisma = {
      trackingLink: { findUnique: jest.fn() },
      trip: { findUnique: jest.fn() },
    };
    return {
      gateway: new TrackingGateway(jwtService as never, prisma as never),
      jwtService,
      prisma,
    };
  };

  it('binds a valid public token to its trip', async () => {
    const { gateway, jwtService, prisma } = createGateway();
    jwtService.verify.mockImplementation(() => {
      throw new Error('not a JWT');
    });
    prisma.trackingLink.findUnique.mockResolvedValue({
      tripId: 'trip-1',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 60_000),
    });
    const client = {
      id: 'socket-1',
      handshake: { auth: { token: 'public-token' }, headers: {} },
      disconnect: jest.fn(),
    };

    await gateway.handleConnection(client as never);

    expect(client.disconnect).not.toHaveBeenCalled();
    expect((client as { publicTripId?: string }).publicTripId).toBe('trip-1');
  });

  it('rejects an expired public token', async () => {
    const { gateway, jwtService, prisma } = createGateway();
    jwtService.verify.mockImplementation(() => {
      throw new Error('not a JWT');
    });
    prisma.trackingLink.findUnique.mockResolvedValue({
      tripId: 'trip-1',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() - 60_000),
    });
    const client = {
      id: 'socket-1',
      handshake: { auth: { token: 'expired-token' }, headers: {} },
      disconnect: jest.fn(),
    };

    await gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalled();
  });

  it('prevents a public socket from joining another trip', async () => {
    const { gateway } = createGateway();
    const client = {
      publicTripId: 'trip-1',
      join: jest.fn(),
    };

    await expect(gateway.handleJoinTrip(client as never, { tripId: 'trip-2' })).resolves.toEqual({
      error: 'Not authorized to join this trip',
    });
    expect(client.join).not.toHaveBeenCalled();
  });
});
