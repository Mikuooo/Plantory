import type { ComponentProps } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const iconMap = {
  calendar: 'calendar-month-outline',
  plant: 'sprout-outline',
  book: 'book-open-page-variant-outline',
  weatherSunny: 'weather-sunny',
  archive: 'archive-outline',
  water: 'watering-can-outline',
  fertilizer: 'flower-outline',
  pot: 'pot-outline',
  media: 'landslide-outline',
  pesticide: 'spray-bottle',
  edit: 'pencil-outline',
  delete: 'trash-can-outline',
  arrowLeft: 'arrow-left',
  chevronLeft: 'chevron-left',
  rotate3d: 'rotate-3d-variant',
  prune: 'content-cut',
  photo: 'camera-outline',
  add: 'plus',
  search: 'magnify',
  filter: 'tune-variant',
  grid: 'view-grid-outline',
  list: 'view-list-outline',
  location: 'map-marker-outline',
  check: 'check',
  move: 'folder-move-outline',
  settings: 'cog-outline',
  menu: 'menu',
  close: 'close',
  chevronRight: 'chevron-right',
} satisfies Record<string, MaterialIconName>;

export type AppIconName = keyof typeof iconMap;
