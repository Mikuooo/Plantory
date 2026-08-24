import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import { iconMap, type AppIconName } from './icon-map';

type AppIconProps = Omit<ComponentProps<typeof MaterialCommunityIcons>, 'name'> & { name: AppIconName };

export function AppIcon({ name, size = 22, ...props }: AppIconProps) {
  return <MaterialCommunityIcons name={iconMap[name]} size={size} {...props} />;
}
