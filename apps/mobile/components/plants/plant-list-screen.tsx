import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSidebarNativeGestureBoundary } from '@/components/app-sidebar';
import { AppIcon } from '@/components/icons';
import { PlantBatchAction, PlantListCard } from '@/components/plants/plant-list-card';
import {
  buildPlantListItems,
  filterPlants,
  getPlantGroupValue,
  plantFilters,
  plantGroupRules,
  plants,
  type PlantFilter,
  type PlantGroupRule,
  type PlantViewMode,
} from '@/components/plants/plant-list-model';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export function PlantListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const contentWidth = Math.max(0, viewportWidth - 32);
  const gridCardWidth = Math.max(0, (contentWidth - 12) / 2);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PlantFilter>('all');
  const [groupRule, setGroupRule] = useState<PlantGroupRule>('location');
  const [groupValue, setGroupValue] = useState('全部');
  const [viewMode, setViewMode] = useState<PlantViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visiblePlants = useMemo(() => filterPlants({
    items: plants,
    query,
    filter,
    groupRule,
    groupValue,
  }), [filter, groupRule, groupValue, query]);
  const listItems = useMemo(
    () => buildPlantListItems(visiblePlants, viewMode, groupRule),
    [groupRule, viewMode, visiblePlants],
  );
  const attentionCount = plants.filter((plant) => plant.needsAttention).length;
  const subOptions = useMemo(
    () => ['全部', ...new Set(plants.map((plant) => getPlantGroupValue(plant, groupRule)))],
    [groupRule],
  );
  const selectionActive = selectedIds.size > 0;

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBatchAction(label: string) {
    Alert.alert(label, `将为已选择的 ${selectedIds.size} 株植物分别创建记录。`);
  }

  return (
    <ThemedView
      className="w-full min-w-0 max-w-full flex-1 overflow-hidden"
      style={{ flex: 1, minWidth: 0, width: viewportWidth, maxWidth: viewportWidth }}>
      <View
        className="w-full min-w-0 max-w-full gap-3 overflow-hidden px-4 pb-2"
        style={{ paddingTop: insets.top + 8 }}>
        <AppSidebarNativeGestureBoundary>
          <ScrollView
            horizontal
            className="w-full min-w-0 max-w-full overflow-hidden"
            contentContainerStyle={{ gap: 8 }}
            showsHorizontalScrollIndicator={false}>
            {plantGroupRules.map((option) => {
              const selected = groupRule === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={`选择分组：${option.label}`}
                  accessibilityState={{ selected }}
                  onPress={() => { setGroupRule(option.value); setGroupValue('全部'); }}
                  className="h-10 justify-center rounded-lg border px-4 active:opacity-70"
                  style={{
                    backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                    borderColor: selected ? theme.primary : theme.border,
                  }}>
                  <ThemedText type="smallBold" themeColor={selected ? 'primary' : 'textSecondary'}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </AppSidebarNativeGestureBoundary>

        <View
          className="h-12 flex-row items-center gap-2 rounded-lg border px-3"
          style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border }}>
          <AppIcon name="search" size={21} color={theme.textSecondary} />
          <AppSidebarNativeGestureBoundary>
            <TextInput
              accessibilityLabel="搜索植物"
              value={query}
              onChangeText={setQuery}
              placeholder="搜索名称、品种或位置"
              placeholderTextColor={theme.textSecondary}
              className="min-w-0 flex-1 text-base"
              style={{ color: theme.text }}
              returnKeyType="search"
            />
          </AppSidebarNativeGestureBoundary>
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="清除搜索"
              className="h-11 w-11 items-center justify-center"
              onPress={() => setQuery('')}>
              <AppIcon name="close" size={19} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <View className="w-full min-w-0 max-w-full flex-row items-center gap-2 overflow-hidden">
          <AppSidebarNativeGestureBoundary>
            <ScrollView
              horizontal
              className="min-w-0 flex-1 overflow-hidden"
              style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, width: 0 }}
              contentContainerStyle={{ gap: 8 }}
              showsHorizontalScrollIndicator={false}>
              {[
                ...subOptions.map((option) => ({ value: option, label: option })),
                ...plantFilters.filter((option) => option.value !== 'all'),
              ].map((option) => {
                const isStatusFilter = option.value === 'attention' || option.value === 'recent';
                const selected = isStatusFilter ? filter === option.value : groupValue === option.value;
                const count = option.value === '全部'
                  ? plants.length
                  : option.value === 'attention'
                    ? attentionCount
                    : option.value === 'recent'
                      ? plants.filter((plant) => plant.recent).length
                      : plants.filter((plant) => getPlantGroupValue(plant, groupRule) === option.value).length;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => isStatusFilter
                      ? setFilter(option.value as PlantFilter)
                      : setGroupValue(option.value)}
                    className="h-10 justify-center rounded-lg border px-3 active:opacity-70"
                    style={{
                      backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                      borderColor: selected ? theme.primary : theme.border,
                    }}>
                    <ThemedText type="smallBold" themeColor={selected ? 'primary' : 'textSecondary'}>
                      {option.label}{count > 0 ? ` ${count}` : ''}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </AppSidebarNativeGestureBoundary>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={viewMode === 'grid' ? '切换为列表视图' : '切换为网格视图'}
            onPress={() => setViewMode((mode) => mode === 'grid' ? 'list' : 'grid')}
            className="h-10 w-10 items-center justify-center rounded-lg border active:opacity-70"
            style={{ borderColor: theme.border }}>
            <AppIcon name={viewMode === 'grid' ? 'grid' : 'list'} size={19} color={theme.primary} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={listItems}
        keyExtractor={(item) => item.id}
        className="w-full min-w-0 max-w-full flex-1"
        style={{ flex: 1, minWidth: 0, maxWidth: '100%' }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: selectionActive ? 92 : 24 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => item.kind === 'section' ? (
          <View className="mt-4 mb-2 flex-row items-center justify-between px-1">
            <View className="flex-row items-center gap-1.5">
              <AppIcon name={groupRule === 'location' ? 'location' : 'plant'} size={17} color={theme.textSecondary} />
              <ThemedText type="smallBold">{item.label}</ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">{item.count} 株</ThemedText>
          </View>
        ) : (
          <View
            className={viewMode === 'grid' ? 'mb-3 min-w-0 flex-row gap-3 overflow-hidden' : 'mb-3 min-w-0'}
            style={{ width: contentWidth, maxWidth: contentWidth }}>
            {item.plants.map((plant) => (
              <PlantListCard
                key={plant.id}
                plant={plant}
                viewMode={viewMode}
                selected={selectedIds.has(plant.id)}
                selectionActive={selectionActive}
                cardWidth={viewMode === 'grid' ? gridCardWidth : contentWidth}
                onPress={() => selectionActive
                  ? toggleSelected(plant.id)
                  : router.push({ pathname: '/plants/[id]/v2', params: { id: plant.id } })}
                onLongPress={() => toggleSelected(plant.id)}
              />
            ))}
            {viewMode === 'grid' && item.plants.length === 1 ? <View className="flex-1" /> : null}
          </View>
        )}
        ListEmptyComponent={(
          <View className="items-center px-8 pt-20">
            <View
              className="mb-4 h-16 w-16 items-center justify-center rounded-lg"
              style={{ backgroundColor: theme.primarySoft }}>
              <AppIcon name="plant" size={32} color={theme.primary} />
            </View>
            <ThemedText type="smallBold">没有找到植物</ThemedText>
            <ThemedText className="mt-1 text-center" type="small" themeColor="textSecondary">
              试试其他名称或清除当前筛选
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => { setQuery(''); setFilter('all'); setGroupValue('全部'); }}
              className="mt-4 min-h-11 justify-center px-4 active:opacity-70">
              <ThemedText type="smallBold" themeColor="primary">清除筛选</ThemedText>
            </Pressable>
          </View>
        )}
      />

      {selectionActive ? (
        <ThemedView
          type="backgroundElement"
          className="absolute right-3 bottom-3 left-3 flex-row items-center rounded-lg border px-2 py-2"
          style={{ borderColor: theme.border }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="退出多选"
            onPress={() => setSelectedIds(new Set())}
            className="h-12 min-w-12 items-center justify-center px-2 active:opacity-70">
            <ThemedText type="smallBold" themeColor="primary">{selectedIds.size} 株</ThemedText>
          </Pressable>
          <View className="mx-1 h-7 w-px" style={{ backgroundColor: theme.border }} />
          <PlantBatchAction icon="water" label="浇水" onPress={() => runBatchAction('批量浇水')} />
          <PlantBatchAction icon="fertilizer" label="施肥" onPress={() => runBatchAction('批量施肥')} />
          <PlantBatchAction icon="move" label="移位置" onPress={() => runBatchAction('批量移动位置')} />
          <PlantBatchAction icon="archive" label="归档" onPress={() => runBatchAction('批量归档')} />
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}
