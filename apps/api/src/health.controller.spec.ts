import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a liveness response', () => {
    const response = new HealthController().getHealth();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('bus-tracking-api');
    expect(response.timestamp).toEqual(expect.any(String));
    expect(response.uptimeSeconds).toEqual(expect.any(Number));
  });
});
