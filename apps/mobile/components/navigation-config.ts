import type { AppIconName } from '@/components/icons';

export type AppRoute = '/' | '/plants' | '/archive';

export type AppNavigationRoute = {
  href: AppRoute;
  tabName: 'index' | 'plants' | 'archive';
  icon: AppIconName;
  label: string;
};

export const appNavigationRoutes: AppNavigationRoute[] = [
  { href: '/', tabName: 'index', icon: 'calendar', label: '日历' },
  { href: '/plants', tabName: 'plants', icon: 'plant', label: '植物' },
  { href: '/archive', tabName: 'archive', icon: 'archive', label: '归档' },
];
