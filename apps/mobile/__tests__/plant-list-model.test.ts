import {
  buildPlantListItems,
  filterPlants,
  plants,
} from '@/components/plants/plant-list-model';

describe('plant list model', () => {
  test('combines query, attention, and group filters', () => {
    expect(filterPlants({
      items: plants,
      query: '迷迭',
      filter: 'attention',
      groupRule: 'location',
      groupValue: '北阳台',
    }).map(({ id }) => id)).toEqual(['rosemary']);
  });

  test('builds stable grouped grid rows', () => {
    const visible = plants.filter(({ location }) => location === '客厅');

    expect(buildPlantListItems(visible, 'grid', 'location')).toEqual([
      { kind: 'section', id: 'section-location-客厅', label: '客厅', count: 2 },
      { kind: 'plants', id: 'grid-location-客厅-0', plants: visible },
    ]);
  });

  test('uses one plant per row in list mode', () => {
    const visible = plants.slice(0, 2);
    const rows = buildPlantListItems(visible, 'list', 'location')
      .filter((item) => item.kind === 'plants');

    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.plants.length === 1)).toBe(true);
  });
});
