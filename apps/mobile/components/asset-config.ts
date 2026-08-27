import type { Href } from 'expo-router';

import type { AppIconName } from '@/components/icons';
import type { AssetCategory } from '@/stores/asset-store';

export type AssetCategoryConfig = {
  category: AssetCategory;
  href: Href;
  icon: AppIconName;
  label: string;
  description: string;
  defaultUnit: string;
};

export const assetCategories: AssetCategoryConfig[] = [
  { category: 'pots', href: '/assets/pots', icon: 'pot', label: '花盆', description: '尺寸、材质与可用数量', defaultUnit: '个' },
  { category: 'media', href: '/assets/media', icon: 'media', label: '介质', description: '土壤、颗粒与配土材料', defaultUnit: '升' },
  { category: 'fertilizers', href: '/assets/fertilizers', icon: 'fertilizer', label: '肥料', description: '肥料库存与使用备注', defaultUnit: '克' },
  { category: 'pesticides', href: '/assets/pesticides', icon: 'pesticide', label: '农药', description: '药剂库存与安全备注', defaultUnit: '毫升' },
];

export function getAssetCategory(category: AssetCategory) {
  const config = assetCategories.find((item) => item.category === category);
  if (!config) throw new Error(`Unknown asset category: ${category}`);
  return config;
}
