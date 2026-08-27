import type { PotMaterial, PurchaseMethod } from '@/stores/asset-store';

export const purchaseMethods: { value: PurchaseMethod; label: string }[] = [
  { value: 'online', label: '线上' },
  { value: 'offline', label: '线下' },
  { value: 'gift', label: '赠送' },
  { value: 'selfMade', label: '自制' },
  { value: 'other', label: '其他' },
];

export const potMaterials: { value: PotMaterial; label: string }[] = [
  { value: 'ceramic', label: '陶瓷' },
  { value: 'terracotta', label: '陶土' },
  { value: 'plastic', label: '塑料' },
  { value: 'cement', label: '水泥' },
  { value: 'other', label: '其他' },
];

export const potColors = ['#B56A42', '#E8E3D9', '#557A61', '#3D4540', '#A7B8C8', '#D4A94E'];

export function getPurchaseMethodLabel(value: PurchaseMethod) {
  return purchaseMethods.find((item) => item.value === value)?.label ?? '其他';
}

export function getPotMaterialLabel(value: PotMaterial) {
  return potMaterials.find((item) => item.value === value)?.label ?? '其他';
}

export function formatPotDimensions(dimensions: import('@/stores/asset-store').PotDimensions) {
  if (dimensions.shape === 'round') {
    return `口径 ${formatMm(dimensions.topDiameterMm)} · 底径 ${formatMm(dimensions.bottomDiameterMm)} · 高 ${formatMm(dimensions.heightMm)}`;
  }
  return `${formatMm(dimensions.lengthMm)} × ${formatMm(dimensions.widthMm)} × ${formatMm(dimensions.heightMm)}`;
}

export function formatCapacity(capacityMl: number | null) {
  if (capacityMl === null) return '未填写';
  return capacityMl >= 1000 ? `${trimZero(capacityMl / 1000)} L` : `${capacityMl} ml`;
}

export function formatPrice(unitPriceCents: number | null) {
  return unitPriceCents === null ? '未填写' : `¥${(unitPriceCents / 100).toFixed(2)}`;
}

function formatMm(value: number) {
  return `${trimZero(value / 10)} cm`;
}

function trimZero(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
