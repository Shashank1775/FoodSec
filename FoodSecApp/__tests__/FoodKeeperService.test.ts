import { foodKeeperService } from '../app/services/expiry/FoodKeeperService';
import { APP_CONFIG } from '../config/env';

describe('FoodKeeperService', () => {
  it('matches common receipt lines to a FoodKeeper product', () => {
    const banana = foodKeeperService.findProduct('ORG BANANAS 2LB');
    expect(banana?.product.name.toLowerCase()).toContain('banana');

    const milk = foodKeeperService.findProduct('MLK 2% GAL');
    expect(milk?.product.name.toLowerCase()).toContain('milk');

    const chicken = foodKeeperService.findProduct('CHKN BREAST BNLS');
    expect(chicken?.product.name.toLowerCase()).toContain('chicken');
  });

  it('returns a positive shelf life with a storage location for matches', () => {
    const estimate = foodKeeperService.estimateShelfLife('eggs');
    expect(estimate.product).not.toBeNull();
    expect(estimate.days).toBeGreaterThan(0);
    expect(['fridge', 'pantry', 'freezer', 'default']).toContain(estimate.storage);
    expect(estimate.confidence).toBeGreaterThan(0);
  });

  it('is more perishable for meat than for pantry staples', () => {
    const beef = foodKeeperService.estimateShelfLife('ground beef');
    const rice = foodKeeperService.estimateShelfLife('white rice');
    expect(beef.days).toBeLessThan(rice.days);
  });

  it('falls back to the default when nothing matches', () => {
    const estimate = foodKeeperService.estimateShelfLife('XQZ 9000 WIDGET');
    expect(estimate.product).toBeNull();
    expect(estimate.storage).toBe('default');
    expect(estimate.days).toBe(APP_CONFIG.defaultExpiryDays);
    expect(estimate.confidence).toBe(0);
  });
});
