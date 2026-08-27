import { Pressable, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/icons';
import type { Plant, PlantViewMode } from '@/components/plants/plant-list-model';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function PlantListCard({
  plant,
  viewMode,
  selected,
  selectionActive,
  cardWidth,
  onPress,
  onLongPress,
}: {
  plant: Plant;
  viewMode: PlantViewMode;
  selected: boolean;
  selectionActive: boolean;
  cardWidth: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  const isGrid = viewMode === 'grid';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${plant.name}，${plant.location}，${plant.activity}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      onLongPress={onLongPress}
      className={`${isGrid ? 'min-w-0 overflow-hidden' : 'w-full min-w-0 min-h-[92px] flex-row items-center'} rounded-lg border active:opacity-75`}
      style={{
        ...(isGrid
          ? { flexGrow: 0, flexShrink: 0, minWidth: 0, width: cardWidth, maxWidth: cardWidth }
          : { width: cardWidth, maxWidth: cardWidth }),
        backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
        borderColor: selected ? theme.primary : theme.border,
      }}>
      <View
        className={`${isGrid ? 'h-[116px] w-full' : 'ml-2 h-[76px] w-[76px] rounded-md'} items-center justify-center overflow-hidden`}
        style={{ backgroundColor: theme.primarySoft }}>
        <AppIcon name="plant" size={isGrid ? 42 : 32} color={theme.primary} />
        {plant.needsAttention ? (
          <View
            className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: theme.accent }}
          />
        ) : null}
        {(selectionActive || selected) ? (
          <View
            className="absolute top-2 left-2 h-6 w-6 items-center justify-center rounded-full border"
            style={{
              backgroundColor: selected ? theme.primary : theme.backgroundElement,
              borderColor: selected ? theme.primary : theme.border,
            }}>
            {selected ? <AppIcon name="check" size={16} color={theme.backgroundElement} /> : null}
          </View>
        ) : null}
      </View>
      <View className={`${isGrid ? 'gap-0.5 px-3 py-2.5' : 'min-w-0 flex-1 gap-0.5 px-3 py-2'}`}>
        <ThemedText type="smallBold" numberOfLines={1}>{plant.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {plant.species} · {plant.location}
        </ThemedText>
        <ThemedText
          type="small"
          themeColor={plant.needsAttention ? 'accent' : 'textSecondary'}
          numberOfLines={1}>
          {plant.activity}
        </ThemedText>
      </View>
      {!isGrid ? (
        <AppIcon name="chevronRight" size={20} color={theme.textSecondary} style={{ marginRight: 10 }} />
      ) : null}
    </Pressable>
  );
}

export function PlantBatchAction({
  icon,
  label,
  onPress,
}: {
  icon: AppIconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-12 min-w-0 flex-1 items-center justify-center gap-0.5 active:opacity-70">
      <AppIcon name={icon} size={19} color={theme.textSecondary} />
      <ThemedText className="text-xs/4" themeColor="textSecondary" numberOfLines={1}>{label}</ThemedText>
    </Pressable>
  );
}
