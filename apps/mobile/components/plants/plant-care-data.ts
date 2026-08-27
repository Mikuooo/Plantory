export type PlantCareRecord = {
  day: number;
  type: string;
  detail: string;
  icon: 'water' | 'fertilizer' | 'photo';
};

export const plantCareRecords: PlantCareRecord[] = [
  { day: 20, type: '施肥', detail: '营养液 5 ml', icon: 'fertilizer' },
  { day: 23, type: '拍照', detail: '记录新叶状态', icon: 'photo' },
  { day: 25, type: '浇水', detail: '约 200 ml', icon: 'water' },
];

export function getPlantName(plantId?: string) {
  return plantId === 'monstera' ? '小龟' : plantId === 'mint' ? '薄荷' : '琴叶榕';
}
