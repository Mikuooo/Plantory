export type Plant = {
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

export type PlantFilter = 'all' | 'attention' | 'recent';
export type PlantGroupRule = 'location' | 'family' | 'genus';
export type PlantViewMode = 'grid' | 'list';
export type PlantListItem =
  | { kind: 'section'; id: string; label: string; count: number }
  | { kind: 'plants'; id: string; plants: Plant[] };

export const plants: Plant[] = [
  { id: 'fiddle-leaf', name: '琴叶榕', species: '琴叶榕', family: '桑科', genus: '榕属', location: '客厅', activity: '3 天前浇水', recent: true },
  { id: 'monstera', name: '小龟', species: '龟背竹', family: '天南星科', genus: '龟背竹属', location: '客厅', activity: '今天待浇水', needsAttention: true },
  { id: 'mint', name: '薄荷', species: '留兰香薄荷', family: '唇形科', genus: '薄荷属', location: '北阳台', activity: '昨天长出新叶', recent: true },
  { id: 'blue-snow', name: '蓝雪花', species: '蓝雪花', family: '白花丹科', genus: '蓝雪花属', location: '北阳台', activity: '2 天前施肥' },
  { id: 'rosemary', name: '迷迭香', species: '迷迭香', family: '唇形科', genus: '鼠尾草属', location: '北阳台', activity: '需要检查叶片', needsAttention: true },
  { id: 'snake', name: '虎尾兰', species: '虎尾兰', family: '天门冬科', genus: '虎尾兰属', location: '书房', activity: '8 天前浇水' },
  { id: 'pothos', name: '绿萝', species: '绿萝', family: '天南星科', genus: '麒麟叶属', location: '书房', activity: '今天拍了照片', recent: true },
  { id: 'succulent', name: '桃蛋', species: '风车草属', family: '景天科', genus: '风车草属', location: '窗台', activity: '5 天前转盆' },
];

export const plantFilters: { value: PlantFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'attention', label: '需关注' },
  { value: 'recent', label: '最近更新' },
];

export const plantGroupRules: { value: PlantGroupRule; label: string }[] = [
  { value: 'location', label: '位置' },
  { value: 'family', label: '科' },
  { value: 'genus', label: '属' },
];

export function getPlantGroupValue(plant: Plant, groupRule: PlantGroupRule) {
  if (groupRule === 'family') return plant.family;
  if (groupRule === 'genus') return plant.genus;
  return plant.location;
}

export function filterPlants({
  items,
  query,
  filter,
  groupRule,
  groupValue,
}: {
  items: Plant[];
  query: string;
  filter: PlantFilter;
  groupRule: PlantGroupRule;
  groupValue: string;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return items.filter((plant) => {
    const matchesQuery = !normalizedQuery || [plant.name, plant.species, plant.location]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    const matchesFilter = filter === 'all'
      || (filter === 'attention' && plant.needsAttention)
      || (filter === 'recent' && plant.recent);
    const matchesGroup = groupValue === '全部'
      || getPlantGroupValue(plant, groupRule) === groupValue;
    return matchesQuery && matchesFilter && matchesGroup;
  });
}

export function buildPlantListItems(
  visiblePlants: Plant[],
  viewMode: PlantViewMode,
  groupRule: PlantGroupRule,
): PlantListItem[] {
  const groups = [...new Set(visiblePlants.map((plant) => getPlantGroupValue(plant, groupRule)))];
  return groups.flatMap((group) => {
    const groupPlants = visiblePlants.filter((plant) => getPlantGroupValue(plant, groupRule) === group);
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
