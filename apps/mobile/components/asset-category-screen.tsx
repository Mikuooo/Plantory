import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { getAssetCategory } from '@/components/asset-config';
import { AssetEditor } from '@/components/assets/asset-editor';
import { HeaderBar } from '@/components/header-bar';
import { AppIcon } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { startFlow } from '@/observability/logger';
import { type AssetDraft, type GeneralAssetCategory, type GeneralAssetItem, useAssetStore } from '@/stores/asset-store';

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
    const flow = startFlow('asset.general.save', {
      category,
      mode: editingItem ? 'update' : 'create',
    });
    try {
      if (editingItem) updateItem(editingItem.id, draft, flow.context);
      else addItem(category, draft, flow.context);
      setFormOpen(false);
      flow.complete({ result: 'state_updated' });
    } catch (error) {
      flow.fail(error, { category });
      Alert.alert('保存失败', '资产暂时无法保存，请重试。');
    }
  };

  const confirmDelete = (item: GeneralAssetItem) => {
    Alert.alert(
      `删除${config.label}`,
      `确定删除“${item.name}”吗？此操作无法撤销。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            const flow = startFlow('asset.general.delete', { category });
            try {
              removeItem(item.id, flow.context);
              flow.complete({ result: 'state_updated' });
            } catch (error) {
              flow.fail(error, { category });
              Alert.alert('删除失败', '资产暂时无法删除，请重试。');
            }
          },
        },
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
