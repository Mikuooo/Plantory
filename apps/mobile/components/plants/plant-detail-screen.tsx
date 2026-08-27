import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Calendar } from '@/components/calendar';
import { AppIcon } from '@/components/icons';
import { HeaderBar } from '@/components/header-bar';
import { BackButton } from '@/components/pots/pot-list-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { plantCareRecords, getPlantName, type PlantCareRecord } from '@/components/plants/plant-care-data';

const plantImage = require('@/assets/images/1.jpg');
export function PlantDetailScreen({ plantId }: { plantId?: string }) {
  const router = useRouter();
  const theme = useTheme();
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const today = new Date();
  const plantName = getPlantName(plantId);
  const activityByDay = Object.fromEntries(plantCareRecords.map((record) => [record.day, record]));
  const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(selectedDay).padStart(2, '0')].join('-');

  return (
    <ThemedView className="flex-1">
      <HeaderBar
        title={plantName}
        subtitle="植物详情"
        leading={<BackButton onPress={() => router.back()} />}
        actionLabel="编辑"
        onActionPress={() => {}}
        navigation
      />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-4 pt-3">
          <Calendar
            selectedDate={todayKey}
            onSelectDate={(date) => setSelectedDay(Number(date.slice(-2)))}
            expanded
            onExpandedChange={() => {}}
            calendarImageSource={plantImage}
            todayStyle="inset"
            headerTrailing={(
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="养护记录详情"
                hitSlop={8}
                onPress={() => router.push({ pathname: '/plants/[id]/care', params: { id: plantId ?? 'fiddle-leaf' } })}
                className="h-9 w-9 items-center justify-center active:opacity-60">
                <AppIcon name="chevronRight" size={20} color={theme.primary} />
              </Pressable>
            )}
          />
          <View className="mt-5 flex-row items-center justify-between px-1"><ThemedText type="smallBold">{selectedDay} 日养护</ThemedText><ThemedText type="small" themeColor="textSecondary">最近记录</ThemedText></View>
          <View className="mt-2 rounded-xl px-4" style={{ backgroundColor: theme.backgroundElement }}>{activityByDay[selectedDay] ? <ActivityRow activity={activityByDay[selectedDay]} /> : <View className="min-h-16 justify-center"><ThemedText type="small" themeColor="textSecondary">这一天暂无养护记录</ThemedText></View>}</View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function ActivityRow({ activity }: { activity: PlantCareRecord }) {
  const theme = useTheme();
  return <View className="min-h-16 flex-row items-center gap-3"><View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.primarySoft }}><AppIcon name={activity.icon} size={18} color={theme.primary} /></View><View><ThemedText type="smallBold">{activity.type}</ThemedText><ThemedText type="small" themeColor="textSecondary">{activity.detail}</ThemedText></View></View>;
}
