import { PublicTrackingController } from './public-tracking.controller';

describe('PublicTrackingController', () => {
  it('passes the public trip token to the service', async () => {
    const service = {
      getTripByToken: jest.fn().mockResolvedValue({ tripId: 'trip-1' }),
    };
    const controller = new PublicTrackingController(service as never);

    await expect(controller.getTripByToken({ token: 'public-token' })).resolves.toEqual({
      tripId: 'trip-1',
    });
    expect(service.getTripByToken).toHaveBeenCalledWith({ token: 'public-token' });
  });

  it('passes location history query to the service', async () => {
    const service = {
      getLocationHistory: jest.fn().mockResolvedValue([]),
    };
    const controller = new PublicTrackingController(service as never);

    await expect(
      controller.getLocationHistory({ token: 'public-token', limit: 10 })
    ).resolves.toEqual([]);
    expect(service.getLocationHistory).toHaveBeenCalledWith({
      token: 'public-token',
      limit: 10,
    });
  });
});
