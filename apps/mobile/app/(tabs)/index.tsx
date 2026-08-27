import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, View } from 'react-native';

import { Calendar, type CalendarMotionHandle } from '@/components/calendar';
import { AppSidebarAvatarButton } from '@/components/app-sidebar';
import { HeaderBar } from '@/components/header-bar';
import { AppIcon } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCalendarPreferences } from '@/hooks/use-preferences';
import { useTheme } from '@/hooks/use-theme';

const actions = ['浇水', '施肥', '修剪', '拍照'];
const today = new Date();
const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [done, setDone] = useState<Record<string, boolean>>({ water: false, check: true });
  const calendarRef = useRef<CalendarMotionHandle>(null);
  const { calendarExpanded, setCalendarExpanded } = useCalendarPreferences();
  const pagePanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => (
      calendarExpanded
      && gesture.dy < -2
      && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 0.75
    ),
    onPanResponderGrant: () => calendarRef.current?.beginCollapseGesture(),
    onPanResponderMove: (_, gesture) => calendarRef.current?.updateCollapseGesture(gesture.dy),
    onPanResponderRelease: (_, gesture) => calendarRef.current?.endCollapseGesture(gesture.vy),
    onPanResponderTerminate: (_, gesture) => calendarRef.current?.endCollapseGesture(gesture.vy),
  }), [calendarExpanded]);

  return (
    <ThemedView
      className="w-full min-w-0 max-w-full flex-1 overflow-hidden"
      style={{ flex: 1, maxWidth: '100%', minWidth: 0 }}
      {...pagePanResponder.panHandlers}>
      <HeaderBar
        title="日历"
        subtitle="今天"
        leading={<AppSidebarAvatarButton />}
        trailing={<TodayWeather />}
      />
      <View className="w-full min-w-0 max-w-full flex-1 overflow-hidden px-4 pt-4">
        <Calendar
          ref={calendarRef}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          expanded={calendarExpanded}
          onExpandedChange={setCalendarExpanded}
        />
        <ScrollView
          className="w-full min-w-0 max-w-full flex-1"
          style={{ maxWidth: '100%', minWidth: 0 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}>
          <View className="gap-4">
            <View className="mt-2 flex-row items-center justify-between px-2">
              <ThemedText type="smallBold">今日待办</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{selectedDate === todayKey ? '2 项' : '无安排'}</ThemedText>
            </View>
            <ThemedView type="backgroundElement" className="mx-2 rounded-xl px-4">
              <TodoRow label="给琴叶榕浇水" checked={done.water} onPress={() => setDone((state) => ({ ...state, water: !state.water }))} />
              <TodoRow label="检查薄荷的新叶" checked={done.check} onPress={() => setDone((state) => ({ ...state, check: !state.check }))} />
            </ThemedView>

            <View className="mt-2 flex-row items-center justify-between px-2">
              <ThemedText type="smallBold">日常操作</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">快速记录</ThemedText>
            </View>
            <View className="flex-row flex-wrap gap-2 px-2">
              {actions.map((action) => <ActionButton key={action} label={action} />)}
            </View>
          </View>
        </ScrollView>
      </View>
    </ThemedView>
  );
}

function TodayWeather() {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityLabel="今日天气：晴，26 度"
      className="min-h-11 flex-row items-center gap-1.5">
      <AppIcon name="weatherSunny" size={20} color={theme.accent} />
      <ThemedText type="smallBold" numberOfLines={1}>晴 26°</ThemedText>
    </View>
  );
}

function TodoRow({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  const theme = useTheme();

  return <Pressable
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    onPress={onPress}
    className="min-h-[58px] flex-row items-center gap-2 border-b"
    style={{ borderBottomColor: theme.border }}>
    <View
      className="h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px]"
      style={{
        backgroundColor: checked ? theme.primary : 'transparent',
        borderColor: checked ? theme.primary : theme.textSecondary,
      }}>
      {checked ? <ThemedText type="smallBold" className="leading-[18px]" style={{ color: theme.backgroundElement }}>✓</ThemedText> : null}
    </View>
    <ThemedText className={checked ? 'opacity-55 line-through' : undefined}>{label}</ThemedText>
  </Pressable>;
}

function ActionButton({ label }: { label: string }) {
  const theme = useTheme();

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    className="min-h-[54px] min-w-[47%] flex-1 items-center justify-center rounded-xl active:opacity-70"
    style={{ backgroundColor: theme.primarySoft }}>
    <ThemedText type="smallBold">{label}</ThemedText>
  </Pressable>;
}
