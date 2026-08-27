import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Image, Pressable, useWindowDimensions, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/icons';
import { Calendar } from '@/components/calendar';
import { getPlantName, plantCareRecords } from '@/components/plants/plant-care-data';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

const plantImage = require('@/assets/images/1.jpg');
const quickActions = [
  { label: '浇水', icon: 'water' as const },
  { label: '施肥', icon: 'fertilizer' as const },
  { label: '修剪', icon: 'prune' as const },
  { label: '拍照', icon: 'photo' as const },
];

const plantProfiles: Record<string, { species: string; family: string; genus: string; location: string }> = {
  'fiddle-leaf': { species: '琴叶榕', family: '桑科', genus: '榕属', location: '客厅' },
  monstera: { species: '龟背竹', family: '天南星科', genus: '龟背竹属', location: '客厅' },
  mint: { species: '留兰香薄荷', family: '唇形科', genus: '薄荷属', location: '北阳台' },
};

const today = new Date();
const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');

export function PlantDetailV2Screen({ plantId }: { plantId?: string }) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollY = useSharedValue(0);
  const actionProgress = useSharedValue(0);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [careCalendarExpanded, setCareCalendarExpanded] = useState(false);
  const plantName = getPlantName(plantId);
  const profile = plantProfiles[plantId ?? 'fiddle-leaf'] ?? plantProfiles['fiddle-leaf'];
  const bannerHeight = Math.min(width * (2 / 3), 360);
  const headerHeight = 72 + insets.top;
  const latestRecord = useMemo(() => plantCareRecords.at(-1), []);
  const stickyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [bannerHeight - 96, bannerHeight - 24], [0, 1], Extrapolation.CLAMP),
  }));
  const floatingBackgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [bannerHeight - 96, bannerHeight - 24], [0.78, 0], Extrapolation.CLAMP),
  }));

  function setQuickActionsOpen(open: boolean) {
    setActionsOpen(open);
    actionProgress.value = withTiming(open ? 1 : 0, { duration: 220 });
  }

  return (
    <ThemedView className="flex-1">
      <View className="absolute left-0 right-0 top-0 z-20 flex-row items-center justify-between px-4" style={{ height: headerHeight, paddingTop: insets.top }}>
        <HeaderSurface className="h-11 w-11" backgroundStyle={floatingBackgroundStyle}>
          <Pressable accessibilityRole="button" accessibilityLabel="返回" hitSlop={8} onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-lg active:opacity-70">
            <AppIcon name="chevronLeft" size={27} color={theme.text} />
          </Pressable>
        </HeaderSurface>
        <HeaderSurface className="h-11 w-11" backgroundStyle={floatingBackgroundStyle}>
          <Pressable accessibilityRole="button" accessibilityLabel="编辑植物" hitSlop={8} onPress={() => {}} className="h-11 w-11 items-center justify-center rounded-lg active:opacity-70">
            <AppIcon name="edit" size={20} color={theme.text} />
          </Pressable>
        </HeaderSurface>
      </View>
      <Animated.View pointerEvents="none" className="absolute left-0 right-0 top-0 z-10" style={[{ height: headerHeight, backgroundColor: theme.backgroundElement }, stickyStyle]} />
      <Animated.ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 172 }}
        onScroll={(event) => { scrollY.value = event.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}>
        <View style={{ height: bannerHeight }}>
          <Image source={plantImage} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        </View>

        <View className="gap-3 px-4 pt-4">
          <View className="rounded-xl p-4" style={{ backgroundColor: theme.backgroundElement }}>
            <View className="flex-row items-center gap-2">
              <View className="shrink-0 rounded-full px-2.5 py-1" style={{ backgroundColor: theme.primarySoft }}><ThemedText type="small" themeColor="primary">{profile.location}</ThemedText></View>
              <ThemedText className="min-w-0 flex-1 text-2xl font-semibold" numberOfLines={1}>{plantName}</ThemedText>
              <View className="shrink-0 rounded-full px-3 py-1" style={{ backgroundColor: theme.primarySoft }}><ThemedText type="smallBold" themeColor="primary">状态良好</ThemedText></View>
            </View>
            <View className="mt-2 flex-row items-center gap-3">
              <ThemedText className="min-w-0 flex-1" type="small" themeColor="textSecondary" numberOfLines={1}>{profile.species} · {profile.family} · {profile.genus}</ThemedText>
              <ThemedText className="shrink-0" type="small" themeColor="textSecondary">养护 128 天</ThemedText>
            </View>
          </View>

          <View className="rounded-xl p-4" style={{ backgroundColor: theme.backgroundElement }}>
            <ThemedText type="smallBold">今天需要关注</ThemedText>
            <View className="mt-3 flex-row gap-3">
              <SummaryItem label="下一次浇水" value="今天" icon="water" />
              <SummaryItem label="上次养护" value={latestRecord ? `${latestRecord.day} 日${latestRecord.type}` : '暂无'} icon="check" />
            </View>
          </View>

          <Calendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            expanded={careCalendarExpanded}
            onExpandedChange={setCareCalendarExpanded}
            headerTitle="养护记录"
            headerTrailing={<Pressable accessibilityRole="button" accessibilityLabel="查看养护记录详情" onPress={() => router.push({ pathname: '/plants/[id]/care', params: { id: plantId ?? 'fiddle-leaf' } })} className="flex-row items-center active:opacity-70"><ThemedText type="smallBold" themeColor="primary">查看全部</ThemedText><AppIcon name="chevronRight" size={18} color={theme.primary} /></Pressable>}
          />

          <View className="rounded-xl p-4" style={{ backgroundColor: theme.backgroundElement }}>
            <View className="mb-3 flex-row items-center justify-between"><ThemedText type="smallBold">成长记录</ThemedText><ThemedText type="smallBold" themeColor="primary">查看全部</ThemedText></View>
            <View className="flex-row gap-3"><Image source={plantImage} resizeMode="cover" className="h-24 flex-1 rounded-lg" /><View className="flex-1 justify-center"><ThemedText type="smallBold">最近一次拍照</ThemedText><ThemedText type="small" themeColor="textSecondary">记录新叶状态</ThemedText><ThemedText type="small" themeColor="textSecondary">23 日</ThemedText></View></View>
          </View>

          <View className="rounded-xl p-4" style={{ backgroundColor: theme.backgroundElement }}>
            <ThemedText type="smallBold">植物资料</ThemedText>
            <InfoRow label="品种" value="琴叶榕" />
            <InfoRow label="位置" value="客厅" />
            <InfoRow label="入手日期" value="2026 年 2 月 20 日" />
          </View>
        </View>
      </Animated.ScrollView>
      {actionsOpen ? <Pressable accessible={false} onPress={() => setQuickActionsOpen(false)} className="absolute inset-0 z-30" /> : null}
      <View pointerEvents="box-none" className="absolute z-40 h-16 w-16" style={{ right: 20, bottom: insets.bottom + 20 }}>
        {quickActions.map((action, index) => (
          <FloatingAction key={action.label} action={action} index={index} open={actionsOpen} progress={actionProgress} onPress={() => setQuickActionsOpen(false)} />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionsOpen ? '收起快速操作' : '展开快速操作'}
          accessibilityState={{ expanded: actionsOpen }}
          onPress={() => setQuickActionsOpen(!actionsOpen)}
          className="absolute inset-0 items-center justify-center rounded-full active:opacity-80"
          style={{ backgroundColor: theme.primary }}>
          <AppIcon name={actionsOpen ? 'close' : 'add'} size={29} color={theme.backgroundElement} />
        </Pressable>
      </View>
    </ThemedView>
  );
}

function FloatingAction({
  action,
  index,
  open,
  progress,
  onPress,
}: {
  action: (typeof quickActions)[number];
  index: number;
  open: boolean;
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const theme = useTheme();
  const angle = [180, 210, 240, 270][index] * Math.PI / 180;
  const radius = 124;
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: Math.cos(angle) * radius * progress.value },
      { translateY: Math.sin(angle) * radius * progress.value },
      { scale: interpolate(progress.value, [0, 1], [0.55, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View pointerEvents={open ? 'auto' : 'none'} className="absolute inset-0" style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        onPress={onPress}
        className="h-14 w-14 items-center justify-center rounded-full border active:opacity-75"
        style={{ backgroundColor: theme.backgroundElement, borderColor: theme.border }}>
        <AppIcon name={action.icon} size={22} color={theme.primary} />
      </Pressable>
    </Animated.View>
  );
}

function HeaderSurface({
  children,
  className,
  backgroundStyle,
}: {
  children: ReactNode;
  className: string;
  backgroundStyle: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View className={`relative overflow-hidden rounded-lg ${className}`}>
      <Animated.View pointerEvents="none" className="absolute inset-0" style={[{ backgroundColor: theme.backgroundElement }, backgroundStyle]} />
      {children}
    </View>
  );
}

function SummaryItem({ label, value, icon }: { label: string; value: string; icon: 'water' | 'check' }) {
  const theme = useTheme();
  return <View className="flex-1 flex-row items-center gap-2"><View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: theme.primarySoft }}><AppIcon name={icon} size={16} color={theme.primary} /></View><View><ThemedText type="small" themeColor="textSecondary">{label}</ThemedText><ThemedText type="smallBold">{value}</ThemedText></View></View>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return <View className="mt-3 flex-row justify-between border-b pb-2" style={{ borderBottomColor: theme.border }}><ThemedText type="small" themeColor="textSecondary">{label}</ThemedText><ThemedText type="small">{value}</ThemedText></View>;
}
