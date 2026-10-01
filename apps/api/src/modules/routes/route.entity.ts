export class RouteEntity {
  id: string;
  origin: string;
  destination: string;
  geometry: { type: 'LineString'; coordinates: number[][] } | null;
  totalDistanceKm: number | null;
  estimatedDurationMinutes: number | null;
  routingMetadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: any) {
    Object.assign(this, partial);
    // Handle geometry conversion from Prisma JsonValue to GeoJSON LineString
    if (partial.geometry && typeof partial.geometry === 'object') {
      const g = partial.geometry;
      if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
        this.geometry = { type: 'LineString', coordinates: g.coordinates };
      } else {
        this.geometry = null;
      }
    } else {
      this.geometry = null;
    }
  }
}
