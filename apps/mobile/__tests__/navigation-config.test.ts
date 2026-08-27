import { appNavigationRoutes, appStackRoutes } from '@/components/navigation-config';

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

  test('registers the complete asset and plant detail route contract once', () => {
    expect(appStackRoutes).toEqual([
      { name: '(tabs)', animation: 'none' },
      { name: 'assets/pots' },
      { name: 'assets/pots/new' },
      { name: 'assets/pots/[id]' },
      { name: 'assets/pots/[id]/edit' },
      { name: 'assets/media' },
      { name: 'assets/fertilizers' },
      { name: 'assets/pesticides' },
      { name: 'plants/[id]' },
      { name: 'plants/[id]/care' },
      { name: 'plants/[id]/v2' },
    ]);
    expect(new Set(appStackRoutes.map(({ name }) => name)).size).toBe(appStackRoutes.length);
  });
});
