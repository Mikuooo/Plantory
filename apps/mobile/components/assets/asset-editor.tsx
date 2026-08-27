import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import type { AssetDraft, GeneralAssetItem } from '@/stores/asset-store';

type AssetFormState = {
  name: string;
  quantity: string;
  unit: string;
  notes: string;
};

export function AssetEditor({
  visible,
  categoryLabel,
  defaultUnit,
  item,
  onClose,
  onSave,
}: {
  visible: boolean;
  categoryLabel: string;
  defaultUnit: string;
  item: GeneralAssetItem | null;
  onClose: () => void;
  onSave: (draft: AssetDraft) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<AssetFormState>(() => createFormState(item, defaultUnit));
  const [error, setError] = useState('');

  const resetForm = () => {
    setForm(createFormState(item, defaultUnit));
    setError('');
  };

  const submit = () => {
    const name = form.name.trim();
    const quantity = Number(form.quantity);
    const unit = form.unit.trim();
    if (!name) return setError('请输入名称');
    if (!Number.isFinite(quantity) || quantity < 0) return setError('请输入有效的非负数量');
    if (!unit) return setError('请输入单位');
    onSave({ name, quantity, unit, notes: form.notes.trim() });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={resetForm}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end">
        <Pressable
          accessibilityLabel="关闭编辑表单"
          onPress={onClose}
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.42)' }}
        />
        <ThemedView
          type="backgroundElement"
          className="rounded-t-lg px-5 pt-5"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="mb-4 flex-row items-center justify-between">
            <ThemedText type="smallBold">{item ? `编辑${categoryLabel}` : `新增${categoryLabel}`}</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="关闭"
              hitSlop={6}
              onPress={onClose}
              className="h-11 w-11 items-center justify-center active:opacity-70">
              <AppIcon name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>
          <FormField label="名称">
            <TextInput
              accessibilityLabel={`${categoryLabel}名称`}
              value={form.name}
              onChangeText={(name) => setForm((current) => ({ ...current, name }))}
              placeholder={`例如：${categoryLabel}名称`}
              placeholderTextColor={theme.textSecondary}
              autoFocus
              className="h-12 rounded-lg border px-3 text-base"
              style={{ color: theme.text, borderColor: theme.border }}
            />
          </FormField>
          <View className="flex-row gap-3">
            <View className="min-w-0 flex-[2]">
              <FormField label="数量">
                <TextInput
                  accessibilityLabel="资产数量"
                  value={form.quantity}
                  onChangeText={(quantity) => setForm((current) => ({ ...current, quantity }))}
                  keyboardType="decimal-pad"
                  className="h-12 rounded-lg border px-3 text-base"
                  style={{ color: theme.text, borderColor: theme.border }}
                />
              </FormField>
            </View>
            <View className="min-w-0 flex-1">
              <FormField label="单位">
                <TextInput
                  accessibilityLabel="资产单位"
                  value={form.unit}
                  onChangeText={(unit) => setForm((current) => ({ ...current, unit }))}
                  className="h-12 rounded-lg border px-3 text-base"
                  style={{ color: theme.text, borderColor: theme.border }}
                />
              </FormField>
            </View>
          </View>
          <FormField label="备注">
            <TextInput
              accessibilityLabel="资产备注"
              value={form.notes}
              onChangeText={(notes) => setForm((current) => ({ ...current, notes }))}
              placeholder="规格、用途或安全信息"
              placeholderTextColor={theme.textSecondary}
              multiline
              textAlignVertical="top"
              className="h-20 rounded-lg border px-3 py-3 text-base"
              style={{ color: theme.text, borderColor: theme.border }}
            />
          </FormField>
          {error ? <ThemedText className="mb-2" type="small" themeColor="accent">{error}</ThemedText> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="保存资产"
            onPress={submit}
            className="mt-1 min-h-12 items-center justify-center rounded-lg active:opacity-70"
            style={{ backgroundColor: theme.primary }}>
            <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>保存</ThemedText>
          </Pressable>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-3 gap-1.5">
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </View>
  );
}

function createFormState(item: GeneralAssetItem | null, defaultUnit: string): AssetFormState {
  return {
    name: item?.name ?? '',
    quantity: item ? String(item.quantity) : '1',
    unit: item?.unit ?? defaultUnit,
    notes: item?.notes ?? '',
  };
}
