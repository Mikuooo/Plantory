import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAssetCategory } from '@/components/asset-config';
import { HeaderBar } from '@/components/header-bar';
import { AppIcon } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { type AssetDraft, type GeneralAssetCategory, type GeneralAssetItem, useAssetStore } from '@/stores/asset-store';

type AssetFormState = {
  name: string;
  quantity: string;
  unit: string;
  notes: string;
};

export function AssetCategoryScreen({ category }: { category: GeneralAssetCategory }) {
  const config = getAssetCategory(category);
  const router = useRouter();
  const theme = useTheme();
  const items = useAssetStore((state) => state.items);
  const hasHydrated = useAssetStore((state) => state.hasHydrated);
  const addItem = useAssetStore((state) => state.addItem);
  const updateItem = useAssetStore((state) => state.updateItem);
  const removeItem = useAssetStore((state) => state.removeItem);
  const [editingItem, setEditingItem] = useState<GeneralAssetItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const categoryItems = useMemo(
    () => items
      .filter((item): item is GeneralAssetItem => item.category === category)
      .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)),
    [category, items],
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEdit = (item: GeneralAssetItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const saveItem = (draft: AssetDraft) => {
    if (editingItem) updateItem(editingItem.id, draft);
    else addItem(category, draft);
    setFormOpen(false);
  };

  const confirmDelete = (item: GeneralAssetItem) => {
    Alert.alert(
      `删除${config.label}`,
      `确定删除“${item.name}”吗？此操作无法撤销。`,
      [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: () => removeItem(item.id) },
      ],
    );
  };

  return (
    <ThemedView className="flex-1">
      <HeaderBar
        title={config.label}
        subtitle="资产管理"
        profileName="资产"
        leading={<IconButton label="返回" icon="chevronLeft" onPress={goBack} />}
        actionLabel={`新增${config.label}`}
        onActionPress={openCreate}
        navigation
      />

      {!hasHydrated ? (
        <View className="flex-1 items-center justify-center px-6">
          <ThemedText themeColor="textSecondary">正在读取资产...</ThemedText>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}>
          <View className="mb-5 flex-row items-center gap-3 px-1">
            <View
              className="h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: theme.primarySoft }}>
              <AppIcon name={config.icon} size={25} color={theme.primary} />
            </View>
            <View className="min-w-0 flex-1">
              <ThemedText type="smallBold">{categoryItems.length} 项{config.label}资产</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{config.description}</ThemedText>
            </View>
          </View>

          {categoryItems.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8 pb-20">
              <View
                className="mb-4 h-16 w-16 items-center justify-center rounded-lg"
                style={{ backgroundColor: theme.primarySoft }}>
                <AppIcon name={config.icon} size={32} color={theme.primary} />
              </View>
              <ThemedText type="smallBold">还没有{config.label}</ThemedText>
              <ThemedText className="mt-1 text-center" type="small" themeColor="textSecondary">
                添加后可在这里查看库存数量和备注
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`新增${config.label}`}
                onPress={openCreate}
                className="mt-5 min-h-11 flex-row items-center gap-2 rounded-lg px-4 active:opacity-70"
                style={{ backgroundColor: theme.primary }}>
                <AppIcon name="add" size={20} color={theme.backgroundElement} />
                <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>新增{config.label}</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View className="gap-3">
              {categoryItems.map((item) => (
                <AssetRow
                  key={item.id}
                  item={item}
                  onEdit={() => openEdit(item)}
                  onDelete={() => confirmDelete(item)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <AssetEditor
        visible={formOpen}
        categoryLabel={config.label}
        defaultUnit={config.defaultUnit}
        item={editingItem}
        onClose={() => setFormOpen(false)}
        onSave={saveItem}
      />
    </ThemedView>
  );
}

function AssetRow({ item, onEdit, onDelete }: { item: GeneralAssetItem; onEdit: () => void; onDelete: () => void }) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      className="min-h-[88px] flex-row items-center gap-3 rounded-lg border px-4 py-3"
      style={{ borderColor: theme.border }}>
      <View className="min-w-0 flex-1 gap-1">
        <ThemedText type="smallBold" numberOfLines={1}>{item.name}</ThemedText>
        <ThemedText themeColor="primary">{item.quantity} {item.unit}</ThemedText>
        {item.notes ? <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>{item.notes}</ThemedText> : null}
      </View>
      <IconButton label={`编辑${item.name}`} icon="edit" onPress={onEdit} />
      <IconButton label={`删除${item.name}`} icon="delete" onPress={onDelete} />
    </ThemedView>
  );
}

function IconButton({ label, icon, onPress }: { label: string; icon: 'chevronLeft' | 'edit' | 'delete' | 'close'; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center active:opacity-70">
      <AppIcon name={icon} size={icon === 'chevronLeft' ? 28 : 22} color={theme.textSecondary} />
    </Pressable>
  );
}

function AssetEditor({
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
        <Pressable accessibilityLabel="关闭编辑表单" onPress={onClose} className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.42)' }} />
        <ThemedView
          type="backgroundElement"
          className="rounded-t-lg px-5 pt-5"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="mb-4 flex-row items-center justify-between">
            <ThemedText type="smallBold">{item ? `编辑${categoryLabel}` : `新增${categoryLabel}`}</ThemedText>
            <IconButton label="关闭" icon="close" onPress={onClose} />
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
