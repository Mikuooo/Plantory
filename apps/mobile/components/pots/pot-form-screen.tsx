import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/header-bar';
import { AppIcon } from '@/components/icons';
import { BackButton } from '@/components/pots/pot-list-screen';
import { potColors, potMaterials, purchaseMethods } from '@/components/pots/pot-options';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { startFlow } from '@/observability/logger';
import { type PotAssetDraft, type PotAssetItem, type PotMaterial, type PotShape, type PurchaseMethod, useAssetStore } from '@/stores/asset-store';

type PotFormState = {
  name: string;
  capacityLiters: string;
  shape: PotShape;
  topDiameterCm: string;
  bottomDiameterCm: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  quantity: string;
  purchaseMethod: PurchaseMethod;
  unitPriceYuan: string;
  notes: string;
  material: PotMaterial;
  color: string;
};

export function PotFormScreen({ potId }: { potId?: string }) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pot = useAssetStore((state) => state.items.find((item): item is PotAssetItem => item.id === potId && item.category === 'pots'));
  const addPot = useAssetStore((state) => state.addPot);
  const updatePot = useAssetStore((state) => state.updatePot);
  const initialForm = useMemo(() => createFormState(pot), [pot]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const editing = Boolean(potId);

  useEffect(() => {
    if (pot) setForm(createFormState(pot));
  }, [pot]);

  const update = <K extends keyof PotFormState>(key: K, value: PotFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const save = () => {
    const result = buildDraft(form);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    const flow = startFlow('asset.pot.save', { mode: pot ? 'update' : 'create' });
    try {
      if (pot) {
        updatePot(pot.id, result.draft, flow.context);
        flow.complete({ result: 'state_updated' });
        router.back();
        return;
      }
      const id = addPot(result.draft, flow.context);
      flow.complete({ result: 'state_updated' });
      router.replace({ pathname: '/assets/pots/[id]', params: { id } });
    } catch (saveError) {
      flow.fail(saveError);
      setError('保存失败，请重试');
    }
  };

  return (
    <ThemedView className="flex-1">
      <HeaderBar
        title={editing ? '编辑花盆' : '新增花盆'}
        subtitle="规格与库存"
        profileName="资产"
        leading={<BackButton onPress={() => router.back()} />}
        navigation
      />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 88 + insets.bottom }}>
          <Section title="基本信息">
            <Field label="名称" required>
              <Input label="花盆名称" value={form.name} placeholder="例如：白色陶盆" onChangeText={(value) => update('name', value)} />
            </Field>
            <Field label="造型" required>
              <Segmented
                options={[{ value: 'round', label: '圆形' }, { value: 'square', label: '方形' }]}
                value={form.shape}
                onChange={(value) => update('shape', value as PotShape)}
              />
            </Field>
            <Field label="材质">
              <Segmented options={potMaterials} value={form.material} onChange={(value) => update('material', value as PotMaterial)} wrap />
            </Field>
            <Field label="颜色">
              <View className="flex-row flex-wrap gap-3">
                {potColors.map((color) => (
                  <Pressable
                    key={color}
                    accessibilityRole="radio"
                    accessibilityLabel={`选择颜色 ${color}`}
                    accessibilityState={{ checked: form.color === color }}
                    onPress={() => update('color', color)}
                    className="h-11 w-11 items-center justify-center rounded-lg border"
                    style={{ backgroundColor: color, borderColor: form.color === color ? theme.primary : theme.border }}>
                    {form.color === color ? <AppIcon name="check" size={20} color={color === '#3D4540' ? '#FFFFFF' : theme.text} /> : null}
                  </Pressable>
                ))}
              </View>
            </Field>
          </Section>

          <Section title="规格">
            <Field label="容量（L）">
              <Input label="花盆容量" value={form.capacityLiters} placeholder="例如：3.5" keyboardType="decimal-pad" onChangeText={(value) => update('capacityLiters', value)} />
            </Field>
            {form.shape === 'round' ? (
              <View className="flex-row gap-3">
                <CompactField label="上口径（cm）"><Input label="花盆上口径" value={form.topDiameterCm} keyboardType="decimal-pad" onChangeText={(value) => update('topDiameterCm', value)} /></CompactField>
                <CompactField label="底径（cm）"><Input label="花盆底径" value={form.bottomDiameterCm} keyboardType="decimal-pad" onChangeText={(value) => update('bottomDiameterCm', value)} /></CompactField>
              </View>
            ) : (
              <View className="flex-row gap-3">
                <CompactField label="长度（cm）"><Input label="花盆长度" value={form.lengthCm} keyboardType="decimal-pad" onChangeText={(value) => update('lengthCm', value)} /></CompactField>
                <CompactField label="宽度（cm）"><Input label="花盆宽度" value={form.widthCm} keyboardType="decimal-pad" onChangeText={(value) => update('widthCm', value)} /></CompactField>
              </View>
            )}
            <Field label="高度（cm）" required>
              <Input label="花盆高度" value={form.heightCm} keyboardType="decimal-pad" onChangeText={(value) => update('heightCm', value)} />
            </Field>
          </Section>

          <Section title="库存与购买">
            <Field label="数量" required>
              <Input label="花盆数量" value={form.quantity} keyboardType="number-pad" onChangeText={(value) => update('quantity', value)} />
            </Field>
            <Field label="购买方式">
              <Segmented options={purchaseMethods} value={form.purchaseMethod} onChange={(value) => update('purchaseMethod', value as PurchaseMethod)} wrap />
            </Field>
            <Field label="单价（元）">
              <Input label="花盆单价" value={form.unitPriceYuan} placeholder="例如：29.90" keyboardType="decimal-pad" onChangeText={(value) => update('unitPriceYuan', value)} />
            </Field>
            <Field label="备注">
              <Input label="花盆备注" value={form.notes} placeholder="规格、用途或购买信息" multiline onChangeText={(value) => update('notes', value)} />
            </Field>
          </Section>
          {error ? <ThemedText type="small" themeColor="accent" className="px-1">{error}</ThemedText> : null}
        </ScrollView>
        <ThemedView type="backgroundElement" className="absolute right-0 bottom-0 left-0 border-t px-4 pt-3" style={{ borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 12) }}>
          <Pressable accessibilityRole="button" accessibilityLabel="保存花盆" onPress={save} className="min-h-12 items-center justify-center rounded-lg active:opacity-70" style={{ backgroundColor: theme.primary }}>
            <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>保存花盆</ThemedText>
          </Pressable>
        </ThemedView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View className="mb-4 gap-1 rounded-lg border px-4 py-4" style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border }}>
      <ThemedText type="smallBold" className="mb-2">{title}</ThemedText>
      {children}
    </View>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View className="mb-3 gap-1.5">
      <ThemedText type="smallBold">{label}{required ? ' *' : ''}</ThemedText>
      {children}
    </View>
  );
}

function CompactField({ label, children }: { label: string; children: React.ReactNode }) {
  return <View className="min-w-0 flex-1"><Field label={label} required>{children}</Field></View>;
}

function Input({ label, multiline, ...props }: React.ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) {
  const theme = useTheme();
  return (
    <TextInput
      {...props}
      accessibilityLabel={label}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      className={`${multiline ? 'h-24 py-3' : 'h-12'} rounded-lg border px-3 text-base`}
      placeholderTextColor={theme.textSecondary}
      style={[{ color: theme.text, borderColor: theme.border }, props.style]}
    />
  );
}

function Segmented({ options, value, onChange, wrap }: { options: { value: string; label: string }[]; value: string; onChange: (value: string) => void; wrap?: boolean }) {
  const theme = useTheme();
  return (
    <View className={`flex-row gap-2 ${wrap ? 'flex-wrap' : ''}`}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            className="min-h-11 min-w-[72px] flex-1 items-center justify-center rounded-lg border px-3 active:opacity-70"
            style={{ backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement, borderColor: selected ? theme.primary : theme.border }}>
            <ThemedText type="smallBold" themeColor={selected ? 'primary' : 'textSecondary'}>{option.label}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function createFormState(pot: PotAssetItem | undefined): PotFormState {
  return {
    name: pot?.name ?? '',
    capacityLiters: pot?.capacityMl === null || pot?.capacityMl === undefined ? '' : String(pot.capacityMl / 1000),
    shape: pot?.dimensions.shape ?? 'round',
    topDiameterCm: String((pot?.dimensions.topDiameterMm ?? 150) / 10),
    bottomDiameterCm: String((pot?.dimensions.bottomDiameterMm ?? 110) / 10),
    lengthCm: String((pot?.dimensions.lengthMm ?? 150) / 10),
    widthCm: String((pot?.dimensions.widthMm ?? 150) / 10),
    heightCm: String((pot?.dimensions.heightMm ?? 140) / 10),
    quantity: String(pot?.quantity ?? 1),
    purchaseMethod: pot?.purchaseMethod ?? 'online',
    unitPriceYuan: pot?.unitPriceCents === null || pot?.unitPriceCents === undefined ? '' : (pot.unitPriceCents / 100).toFixed(2),
    notes: pot?.notes ?? '',
    material: pot?.appearance.material ?? 'terracotta',
    color: pot?.appearance.color ?? '#B56A42',
  };
}

function buildDraft(form: PotFormState): { draft: PotAssetDraft } | { error: string } {
  const name = form.name.trim();
  const quantity = Number(form.quantity);
  const capacityLiters = form.capacityLiters.trim() ? Number(form.capacityLiters) : null;
  const heightCm = Number(form.heightCm);
  const topDiameterCm = Number(form.topDiameterCm);
  const bottomDiameterCm = Number(form.bottomDiameterCm);
  const lengthCm = Number(form.lengthCm);
  const widthCm = Number(form.widthCm);
  const priceYuan = form.unitPriceYuan.trim() ? Number(form.unitPriceYuan) : null;
  if (!name) return { error: '请输入花盆名称' };
  if (!Number.isInteger(quantity) || quantity < 0) return { error: '数量必须是非负整数' };
  if (capacityLiters !== null && (!Number.isFinite(capacityLiters) || capacityLiters <= 0)) return { error: '容量必须大于 0' };
  if (!Number.isFinite(heightCm) || heightCm <= 0) return { error: '高度必须大于 0' };
  if (form.shape === 'round' && (![topDiameterCm, bottomDiameterCm].every((value) => Number.isFinite(value) && value > 0))) return { error: '上口径和底径必须大于 0' };
  if (form.shape === 'square' && (![lengthCm, widthCm].every((value) => Number.isFinite(value) && value > 0))) return { error: '长度和宽度必须大于 0' };
  if (priceYuan !== null && (!Number.isFinite(priceYuan) || priceYuan < 0)) return { error: '价格不能小于 0' };
  return {
    draft: {
      name,
      capacityMl: capacityLiters === null ? null : Math.round(capacityLiters * 1000),
      dimensions: {
        shape: form.shape,
        topDiameterMm: Math.round(topDiameterCm * 10),
        bottomDiameterMm: Math.round(bottomDiameterCm * 10),
        lengthMm: Math.round(lengthCm * 10),
        widthMm: Math.round(widthCm * 10),
        heightMm: Math.round(heightCm * 10),
      },
      quantity,
      purchaseMethod: form.purchaseMethod,
      unitPriceCents: priceYuan === null ? null : Math.round(priceYuan * 100),
      currency: 'CNY',
      notes: form.notes.trim(),
      appearance: { color: form.color, material: form.material },
    },
  };
}
