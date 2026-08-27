import {
  formatCapacity,
  formatPotDimensions,
  formatPrice,
  getPotMaterialLabel,
  getPurchaseMethodLabel,
} from '@/components/pots/pot-options';

describe('pot display rules', () => {
  test('formats round and square dimensions in centimeters', () => {
    expect(formatPotDimensions({
      shape: 'round',
      topDiameterMm: 155,
      bottomDiameterMm: 110,
      lengthMm: 0,
      widthMm: 0,
      heightMm: 142,
    })).toBe('口径 15.5 cm · 底径 11 cm · 高 14.2 cm');

    expect(formatPotDimensions({
      shape: 'square',
      topDiameterMm: 0,
      bottomDiameterMm: 0,
      lengthMm: 120,
      widthMm: 135,
      heightMm: 140,
    })).toBe('12 cm × 13.5 cm × 14 cm');
  });

  test('formats optional capacity and price values', () => {
    expect(formatCapacity(null)).toBe('未填写');
    expect(formatCapacity(850)).toBe('850 ml');
    expect(formatCapacity(1250)).toBe('1.3 L');
    expect(formatPrice(null)).toBe('未填写');
    expect(formatPrice(1299)).toBe('¥12.99');
  });

  test('keeps stable labels and safe fallbacks', () => {
    expect(getPurchaseMethodLabel('selfMade')).toBe('自制');
    expect(getPotMaterialLabel('terracotta')).toBe('陶土');
    expect(getPurchaseMethodLabel('unknown' as never)).toBe('其他');
  });
});
