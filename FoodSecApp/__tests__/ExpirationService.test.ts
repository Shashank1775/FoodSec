import { ExpirationService } from '../app/services/ExpirationService';

const service = new ExpirationService();
const now = new Date('2025-04-21T15:00:00');
const daysFromNow = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return d;
};

describe('ExpirationService', () => {
  it('counts whole days regardless of time of day', () => {
    expect(service.getDaysUntilExpiry(new Date('2025-04-22T01:00:00'), now)).toBe(1);
    expect(service.getDaysUntilExpiry(new Date('2025-04-20T23:59:00'), now)).toBe(-1);
  });

  it('derives status from the expiring-soon window', () => {
    expect(service.getStatusForDate(daysFromNow(-1), now)).toBe('expired');
    expect(service.getStatusForDate(daysFromNow(0), now)).toBe('soon');
    expect(service.getStatusForDate(daysFromNow(3), now)).toBe('soon');
    expect(service.getStatusForDate(daysFromNow(4), now)).toBe('fresh');
  });

  it('produces human-readable messages', () => {
    expect(service.getExpirationMessage({ estimatedExpiry: daysFromNow(-2) }, now)).toBe('Expired 2 days ago');
    expect(service.getExpirationMessage({ estimatedExpiry: daysFromNow(-1) }, now)).toBe('Expired yesterday');
    expect(service.getExpirationMessage({ estimatedExpiry: daysFromNow(0) }, now)).toBe('Expires today');
    expect(service.getExpirationMessage({ estimatedExpiry: daysFromNow(1) }, now)).toBe('Expires tomorrow');
    expect(service.getExpirationMessage({ estimatedExpiry: daysFromNow(5) }, now)).toBe('Expires in 5 days');
  });
});
