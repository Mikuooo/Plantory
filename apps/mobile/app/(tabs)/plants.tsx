import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AppSidebarNativeGestureBoundary } from '@/components/app-sidebar';
import { AppIcon, type AppIconName } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

type Plant = {
  id: string;
  name: string;
  species: string;
  family: string;
  genus: string;
  location: string;
  activity: string;
  needsAttention?: boolean;
  recent?: boolean;
};

type Filter = 'all' | 'attention' | 'recent';
type GroupRule = 'location' | 'family' | 'genus';
type ViewMode = 'grid' | 'list';
type PlantListItem =
  | { kind: 'section'; id: string; label: string; count: number }
  | { kind: 'plants'; id: string; plants: Plant[] };

const plants: Plant[] = [
  { id: 'fiddle-leaf', name: '琴叶榕', species: '琴叶榕', family: '桑科', genus: '榕属', location: '客厅', activity: '3 天前浇水', recent: true },
  { id: 'monstera', name: '小龟', species: '龟背竹', family: '天南星科', genus: '龟背竹属', location: '客厅', activity: '今天待浇水', needsAttention: true },
  { id: 'mint', name: '薄荷', species: '留兰香薄荷', family: '唇形科', genus: '薄荷属', location: '北阳台', activity: '昨天长出新叶', recent: true },
  { id: 'blue-snow', name: '蓝雪花', species: '蓝雪花', family: '白花丹科', genus: '白花丹属', location: '北阳台', activity: '2 天前施肥' },
  { id: 'rosemary', name: '迷迭香', species: '迷迭香', family: '唇形科', genus: '鼠尾草属', location: '北阳台', activity: '需要检查叶片', needsAttention: true },
  { id: 'snake', name: '虎尾兰', species: '虎尾兰', family: '天门冬科', genus: '虎尾兰属', location: '书房', activity: '8 天前浇水' },
  { id: 'pothos', name: '绿萝', species: '绿萝', family: '天南星科', genus: '麒麟叶属', location: '书房', activity: '今天拍了照片', recent: true },
  { id: 'succulent', name: '桃蛋', species: '风车草属', family: '景天科', genus: '风车草属', location: '窗台', activity: '5 天前转盆' },
];

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'attention', label: '需关注' },
  { value: 'recent', label: '最近更新' },
];

const groupRules: { value: GroupRule; label: string }[] = [
  { value: 'location', label: '位置' },
  { value: 'family', label: '科' },
  { value: 'genus', label: '属' },
];

export default function PlantsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const contentWidth = Math.max(0, viewportWidth - 32);
  const gridCardWidth = Math.max(0, (contentWidth - 12) / 2);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [groupRule, setGroupRule] = useState<GroupRule>('location');
  const [groupValue, setGroupValue] = useState('全部');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visiblePlants = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return plants.filter((plant) => {
      const matchesQuery = !normalizedQuery || [plant.name, plant.species, plant.location]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
      const matchesFilter = filter === 'all'
        || (filter === 'attention' && plant.needsAttention)
        || (filter === 'recent' && plant.recent);
      const matchesGroup = groupValue === '全部' || getGroupValue(plant, groupRule) === groupValue;
      return matchesQuery && matchesFilter && matchesGroup;
    });
  }, [filter, groupRule, groupValue, query]);

  const listItems = useMemo(
    () => buildListItems(visiblePlants, viewMode, groupRule),
    [groupRule, viewMode, visiblePlants],
  );
  const attentionCount = plants.filter((plant) => plant.needsAttention).length;
  const subOptions = useMemo(() => ['全部', ...new Set(plants.map((plant) => getGroupValue(plant, groupRule)))], [groupRule]);
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
            {groupRules.map((option) => {
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
                ...filters.filter((option) => option.value !== 'all'),
              ].map((option) => {
                const isStatusFilter = option.value === 'attention' || option.value === 'recent';
                const selected = isStatusFilter ? filter === option.value : groupValue === option.value;
                const count = option.value === '全部'
                  ? plants.length
                  : option.value === 'attention'
                    ? attentionCount
                    : option.value === 'recent'
                      ? plants.filter((plant) => plant.recent).length
                      : plants.filter((plant) => getGroupValue(plant, groupRule) === option.value).length;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => isStatusFilter
                      ? setFilter(option.value as Filter)
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
              <PlantCard
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
          <BatchAction icon="water" label="浇水" onPress={() => runBatchAction('批量浇水')} />
          <BatchAction icon="fertilizer" label="施肥" onPress={() => runBatchAction('批量施肥')} />
          <BatchAction icon="move" label="移位置" onPress={() => runBatchAction('批量移动位置')} />
          <BatchAction icon="archive" label="归档" onPress={() => runBatchAction('批量归档')} />
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

function getGroupValue(plant: Plant, groupRule: GroupRule) {
  if (groupRule === 'family') return plant.family;
  if (groupRule === 'genus') return plant.genus;
  return plant.location;
}

function buildListItems(visiblePlants: Plant[], viewMode: ViewMode, groupRule: GroupRule): PlantListItem[] {
  const groups = [...new Set(visiblePlants.map((plant) => getGroupValue(plant, groupRule)))];
  return groups.flatMap((group) => {
    const groupPlants = visiblePlants.filter((plant) => getGroupValue(plant, groupRule) === group);
    const rows: PlantListItem[] = [{
      kind: 'section',
      id: `section-${groupRule}-${group}`,
      label: group,
      count: groupPlants.length,
    }];
    const rowSize = viewMode === 'grid' ? 2 : 1;
    for (let index = 0; index < groupPlants.length; index += rowSize) {
      rows.push({
        kind: 'plants',
        id: `${viewMode}-${groupRule}-${group}-${index}`,
        plants: groupPlants.slice(index, index + rowSize),
      });
    }
    return rows;
  });
}

function PlantCard({
  plant,
  viewMode,
  selected,
  selectionActive,
  cardWidth,
  onPress,
  onLongPress,
}: {
  plant: Plant;
  viewMode: ViewMode;
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

function BatchAction({ icon, label, onPress }: { icon: AppIconName; label: string; onPress: () => void }) {
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
