import { appNavigationRoutes } from '@/components/navigation-config';

describe('primary navigation contract', () => {
  test('keeps calendar, plants, and archive in the product order', () => {
    expect(appNavigationRoutes).toEqual([
      { href: '/', tabName: 'index', icon: 'calendar', label: '日历' },
      { href: '/plants', tabName: 'plants', icon: 'plant', label: '植物' },
      { href: '/archive', tabName: 'archive', icon: 'archive', label: '归档' },
    ]);
  });

  test('does not expose duplicate routes or labels', () => {
    expect(new Set(appNavigationRoutes.map(({ href }) => href)).size).toBe(appNavigationRoutes.length);
    expect(new Set(appNavigationRoutes.map(({ label }) => label)).size).toBe(appNavigationRoutes.length);
  });
});
