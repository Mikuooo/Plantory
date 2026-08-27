import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { HeaderBar } from '@/components/header-bar';
import { AppIcon } from '@/components/icons';
import { formatCapacity, formatPotDimensions, formatPrice, getPurchaseMethodLabel } from '@/components/pots/pot-options';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useAssetStore } from '@/stores/asset-store';

export function PotListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const hasHydrated = useAssetStore((state) => state.hasHydrated);
  const pots = useAssetStore((state) => state.items)
    .filter((item) => item.category === 'pots')
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));

  const goBack = () => router.canGoBack() ? router.back() : router.replace('/');

  return (
    <ThemedView className="flex-1">
      <HeaderBar
        title="花盆"
        subtitle="资产管理"
        profileName="资产"
        leading={<BackButton onPress={goBack} />}
        actionLabel="新增花盆"
        onActionPress={() => router.push('/assets/pots/new')}
        navigation
      />
      {!hasHydrated ? (
        <View className="flex-1 items-center justify-center"><ThemedText themeColor="textSecondary">正在读取花盆...</ThemedText></View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 32 }}>
          <View className="mb-5 flex-row items-center gap-3 px-1">
            <View className="h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: theme.primarySoft }}>
              <AppIcon name="pot" size={25} color={theme.primary} />
            </View>
            <View className="min-w-0 flex-1">
              <ThemedText type="smallBold">{pots.length} 项花盆资产</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">规格、库存与购买信息</ThemedText>
            </View>
          </View>
          {pots.length === 0 ? <EmptyPots onAdd={() => router.push('/assets/pots/new')} /> : (
            <View className="gap-3">
              {pots.map((pot) => (
                <Pressable
                  key={pot.id}
                  accessibilityRole="button"
                  accessibilityLabel={`查看花盆：${pot.name}`}
                  onPress={() => router.push({ pathname: '/assets/pots/[id]', params: { id: pot.id } })}
                  className="min-h-[112px] flex-row items-center gap-3 rounded-lg border px-3 py-3 active:opacity-75"
                  style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border }}>
                  <View className="h-20 w-20 items-center justify-center rounded-lg" style={{ backgroundColor: theme.primarySoft }}>
                    <View
                      className="border-b-[3px]"
                      style={{
                        width: pot.dimensions.shape === 'round' ? 46 : 42,
                        height: 44,
                        backgroundColor: pot.appearance.color,
                        borderBottomColor: theme.border,
                        borderRadius: pot.dimensions.shape === 'round' ? 8 : 2,
                        transform: [{ perspective: 120 }, { rotateX: '-8deg' }],
                      }}
                    />
                  </View>
                  <View className="min-w-0 flex-1 gap-1">
                    <View className="flex-row items-center justify-between gap-2">
                      <ThemedText type="smallBold" numberOfLines={1}>{pot.name}</ThemedText>
                      <ThemedText type="smallBold" themeColor="primary">{pot.quantity} 个</ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{formatPotDimensions(pot.dimensions)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {formatCapacity(pot.capacityMl)} · {getPurchaseMethodLabel(pot.purchaseMethod)} · {formatPrice(pot.unitPriceCents)}
                    </ThemedText>
                  </View>
                  <AppIcon name="chevronRight" size={20} color={theme.textSecondary} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

function EmptyPots({ onAdd }: { onAdd: () => void }) {
  const theme = useTheme();
  return (
    <View className="flex-1 items-center justify-center px-8 pb-20">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-lg" style={{ backgroundColor: theme.primarySoft }}>
        <AppIcon name="pot" size={32} color={theme.primary} />
      </View>
      <ThemedText type="smallBold">还没有花盆</ThemedText>
      <ThemedText className="mt-1 text-center" type="small" themeColor="textSecondary">添加规格后可生成对应比例的 3D 模型</ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel="新增花盆" onPress={onAdd} className="mt-5 min-h-11 flex-row items-center gap-2 rounded-lg px-4 active:opacity-70" style={{ backgroundColor: theme.primary }}>
        <AppIcon name="add" size={20} color={theme.backgroundElement} />
        <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>新增花盆</ThemedText>
      </Pressable>
    </View>
  );
}

export function BackButton({ onPress, floating = false }: { onPress: () => void; floating?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="返回" hitSlop={8} onPress={onPress} className="h-11 w-11 items-center justify-center rounded-full active:opacity-70" style={{ backgroundColor: floating ? 'rgba(255,255,255,0.68)' : 'transparent' }}>
      <AppIcon name="chevronLeft" size={28} color={theme.textSecondary} />
    </Pressable>
  );
}
