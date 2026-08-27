import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StatusBar, useWindowDimensions, View } from 'react-native';

import { HeaderBar } from '@/components/header-bar';
import { AppIcon } from '@/components/icons';
import { PotModelViewer } from '@/components/pots/pot-model-viewer';
import { BackButton } from '@/components/pots/pot-list-screen';
import { formatCapacity, formatPotDimensions, formatPrice, getPotMaterialLabel, getPurchaseMethodLabel } from '@/components/pots/pot-options';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { startFlow } from '@/observability/logger';
import { type PotAssetItem, useAssetStore } from '@/stores/asset-store';

export function PotDetailScreen({ potId }: { potId: string }) {
  const router = useRouter();
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const hasHydrated = useAssetStore((state) => state.hasHydrated);
  const pot = useAssetStore((state) => state.items.find((item): item is PotAssetItem => item.id === potId && item.category === 'pots'));
  const removeItem = useAssetStore((state) => state.removeItem);

  if (!hasHydrated) {
    return (
      <ThemedView className="flex-1">
        <HeaderBar title="花盆" subtitle="正在读取" profileName="资产" leading={<BackButton onPress={() => router.back()} />} navigation />
        <View className="flex-1 items-center justify-center"><ThemedText themeColor="textSecondary">正在读取花盆...</ThemedText></View>
      </ThemedView>
    );
  }

  if (!pot) {
    return (
      <ThemedView className="flex-1">
        <HeaderBar title="花盆" subtitle="未找到" profileName="资产" leading={<BackButton onPress={() => router.back()} />} navigation />
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <AppIcon name="pot" size={42} color={theme.textSecondary} />
          <ThemedText type="smallBold">找不到这个花盆</ThemedText>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/assets/pots')} className="min-h-11 justify-center px-4"><ThemedText type="smallBold" themeColor="primary">返回花盆列表</ThemedText></Pressable>
        </View>
      </ThemedView>
    );
  }

  const confirmDelete = () => Alert.alert('删除花盆', `确定删除“${pot.name}”吗？此操作无法撤销。`, [
    { text: '取消', style: 'cancel' },
    {
      text: '删除',
      style: 'destructive',
      onPress: () => {
        const flow = startFlow('asset.pot.delete');
        try {
          removeItem(pot.id, flow.context);
          flow.complete({ result: 'state_updated' });
          router.replace('/assets/pots');
        } catch (error) {
          flow.fail(error);
          Alert.alert('删除失败', '花盆暂时无法删除，请重试。');
        }
      },
    },
  ]);

  return (
    <ThemedView className="flex-1">
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <HeaderBar
        title={pot.name}
        subtitle="花盆详情"
        profileName="资产"
        leading={<BackButton onPress={() => router.back()} floating />}
        actionLabel="编辑"
        onActionPress={() => router.push({ pathname: '/assets/pots/[id]/edit', params: { id: pot.id } })}
        transparent
        navigation
      />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ height: windowHeight }}>
          <PotModelViewer pot={pot} fullScreen />
        </View>
        <View className="px-5">
          <View className="flex-row items-end justify-between border-b py-5" style={{ borderBottomColor: theme.border }}>
            <View className="gap-1">
              <ThemedText type="small" themeColor="textSecondary">当前库存</ThemedText>
              <ThemedText className="text-[30px] leading-9 font-semibold" themeColor="primary">{pot.quantity} 个</ThemedText>
            </View>
            <View className="items-end gap-1">
              <ThemedText type="small" themeColor="textSecondary">单价</ThemedText>
              <ThemedText type="smallBold">{formatPrice(pot.unitPriceCents)}</ThemedText>
            </View>
          </View>
          <DetailSection title="规格">
            <DetailRow label="容量" value={formatCapacity(pot.capacityMl)} />
            <DetailRow label="尺寸" value={formatPotDimensions(pot.dimensions)} />
            <DetailRow label="造型" value={pot.dimensions.shape === 'round' ? '圆形' : '方形'} />
          </DetailSection>
          <DetailSection title="购买信息">
            <DetailRow label="购买方式" value={getPurchaseMethodLabel(pot.purchaseMethod)} />
            <DetailRow label="价格" value={formatPrice(pot.unitPriceCents)} />
          </DetailSection>
          <DetailSection title="外观">
            <DetailRow label="材质" value={getPotMaterialLabel(pot.appearance.material)} />
            <View className="min-h-12 flex-row items-center justify-between gap-4">
              <ThemedText type="small" themeColor="textSecondary">颜色</ThemedText>
              <View className="h-7 w-7 rounded-md border" style={{ backgroundColor: pot.appearance.color, borderColor: theme.border }} />
            </View>
          </DetailSection>
          {pot.notes ? <DetailSection title="备注"><ThemedText>{pot.notes}</ThemedText></DetailSection> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="删除花盆" onPress={confirmDelete} className="mt-5 min-h-12 flex-row items-center justify-center gap-2 rounded-lg border active:opacity-70" style={{ borderColor: theme.accent }}>
            <AppIcon name="delete" size={20} color={theme.accent} />
            <ThemedText type="smallBold" themeColor="accent">删除花盆</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return <View className="border-b py-4" style={{ borderBottomColor: theme.border }}><ThemedText type="smallBold" className="mb-2">{title}</ThemedText>{children}</View>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View className="min-h-12 flex-row items-center justify-between gap-4"><ThemedText type="small" themeColor="textSecondary">{label}</ThemedText><ThemedText className="min-w-0 flex-1 text-right" numberOfLines={2}>{value}</ThemedText></View>;
}
