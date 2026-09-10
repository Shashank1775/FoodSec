/**
 * Pure date helpers for expiry status. Everything is computed from
 * `estimatedExpiry` at read time so items age correctly without a background job.
 */
import { APP_CONFIG } from '../../config/env';
import { Item, ItemStatus } from './api/models';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export class ExpirationService {
  /** Whole days from today until `expiryDate` (negative when already expired). */
  getDaysUntilExpiry(expiryDate: Date | string, now: Date = new Date()): number {
    const expiry = startOfDay(new Date(expiryDate));
    const today = startOfDay(now);
    return Math.round((expiry.getTime() - today.getTime()) / MS_PER_DAY);
  }

  getStatusForDate(expiryDate: Date | string, now: Date = new Date()): ItemStatus {
    const days = this.getDaysUntilExpiry(expiryDate, now);
    if (days < 0) return 'expired';
    if (days <= APP_CONFIG.expiringSoonDays) return 'soon';
    return 'fresh';
  }

  getItemStatus(item: Pick<Item, 'estimatedExpiry'>, now: Date = new Date()): ItemStatus {
    return this.getStatusForDate(item.estimatedExpiry, now);
  }

  getExpirationMessage(item: Pick<Item, 'estimatedExpiry'>, now: Date = new Date()): string {
    const days = this.getDaysUntilExpiry(item.estimatedExpiry, now);
    if (days < -1) return `Expired ${Math.abs(days)} days ago`;
    if (days === -1) return 'Expired yesterday';
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  }

  getStatusColor(status: ItemStatus): string {
    switch (status) {
      case 'fresh':
        return '#4CAF50';
      case 'soon':
        return '#FFC107';
      case 'expired':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  }
}

export const expirationService = new ExpirationService();
export default ExpirationService;
