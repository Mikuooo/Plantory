import type { AppIconName } from '@/components/icons';

export type AppRoute = '/' | '/plants' | '/archive';

export type AppNavigationRoute = {
  href: AppRoute;
  tabName: 'index' | 'plants' | 'archive';
  icon: AppIconName;
  label: string;
};

export type AppStackRoute = {
  name:
    | '(tabs)'
    | 'assets/pots'
    | 'assets/pots/new'
    | 'assets/pots/[id]'
    | 'assets/pots/[id]/edit'
    | 'assets/media'
    | 'assets/fertilizers'
    | 'assets/pesticides'
    | 'plants/[id]'
    | 'plants/[id]/care'
    | 'plants/[id]/v2';
  animation?: 'none';
};

export const appNavigationRoutes: AppNavigationRoute[] = [
  { href: '/', tabName: 'index', icon: 'calendar', label: '日历' },
  { href: '/plants', tabName: 'plants', icon: 'plant', label: '植物' },
  { href: '/archive', tabName: 'archive', icon: 'archive', label: '归档' },
];

export const appStackRoutes: AppStackRoute[] = [
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
];
