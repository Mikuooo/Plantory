import { useEffect, useRef } from 'react';
import { Image, Pressable, View } from 'react-native';
import Animated, { interpolate, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { useAppSidebarSwipeExclusion } from '@/components/app-sidebar';
import { getDateKey } from '@/components/calendar/calendar-date-utils';
import type { CalendarMotionController } from '@/components/calendar/use-calendar-motion';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { CalendarProps } from '@/components/calendar/calendar-types';

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

function MonthAnimatedRow({
  rowIndex,
  targetRowIndex,
  collapseProgress,
  children,
}: {
  rowIndex: number;
  targetRowIndex: number;
  collapseProgress: SharedValue<number>;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: rowIndex === targetRowIndex
      ? 1
      : interpolate(collapseProgress.value, [0, 0.94, 1], [1, 0.28, 0], 'clamp'),
  }));

  return <Animated.View className="w-full min-w-0 flex-row" style={style}>{children}</Animated.View>;
}

export function CalendarGrid({
  motion,
  selectedDate,
  calendarImageSource,
  todayStyle = 'border',
  headerTrailing,
  headerTitle,
}: Pick<CalendarProps, 'selectedDate' | 'calendarImageSource' | 'todayStyle' | 'headerTrailing' | 'headerTitle'> & {
  motion: CalendarMotionController;
}) {
  const theme = useTheme();
  const sidebarSwipeExclusion = useAppSidebarSwipeExclusion();
  const containerRef = useRef<View>(null);

  useEffect(() => () => {
    if (sidebarSwipeExclusion) sidebarSwipeExclusion.current = null;
  }, [sidebarSwipeExclusion]);

  const renderTrack = (pages: CalendarMotionController['monthPages'], isMonth: boolean) => (
    <Animated.View
      className="flex-row"
      style={[{ marginLeft: -motion.pageWidth, width: motion.pageWidth * 3 }, motion.trackStyle]}>
      {pages.map((page) => (
        <Animated.View
          key={`${isMonth ? 'month' : 'week'}-${page.offset}-${getDateKey(page.anchor)}`}
          pointerEvents={page.offset === 0 ? 'auto' : 'none'}
          style={[{ width: motion.pageWidth }, isMonth ? motion.monthGridStyle : undefined]}>
          <View className="w-full min-w-0">
            {Array.from({ length: page.dates.length / 7 }, (_, rowIndex) => (
              <MonthAnimatedRow
                key={rowIndex}
                rowIndex={rowIndex}
                targetRowIndex={motion.collapseRowIndex}
                collapseProgress={motion.collapseProgress}>
                {page.dates.slice(rowIndex * 7, rowIndex * 7 + 7).map((date, columnIndex) => {
                  const key = getDateKey(date);
                  const isSelected = key === selectedDate;
                  const isToday = key === motion.todayKey;
                  const isOutsideMonth = isMonth && date.getMonth() !== page.anchor.getMonth();

                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={`${date.getMonth() + 1}月${date.getDate()}日`}
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => motion.selectDate(date)}
                      hitSlop={2}
                      className="min-w-0 flex-1 items-center justify-center active:opacity-60"
                      style={{ aspectRatio: 1, flexBasis: 0 }}>
                      <View
                        className="items-center justify-center overflow-hidden rounded-lg"
                        style={{
                          alignSelf: 'stretch',
                          backgroundColor: isSelected
                            ? theme.primary
                            : isOutsideMonth ? theme.background : theme.primarySoft,
                          borderColor: isToday && !isSelected ? theme.primary : 'transparent',
                          borderWidth: 1,
                          flex: 1,
                          margin: 2,
                        }}>
                        {calendarImageSource ? (
                          <Image
                            source={calendarImageSource}
                            resizeMode="cover"
                            style={{
                              position: 'absolute',
                              width: motion.pageWidth,
                              height: (page.dates.length / 7) * (motion.pageWidth / 7),
                              left: -columnIndex * (motion.pageWidth / 7),
                              top: -rowIndex * (motion.pageWidth / 7),
                              opacity: isOutsideMonth ? 0.25 : 0.72,
                            }}
                          />
                        ) : null}
                        {isToday && !isSelected && todayStyle === 'inset' ? (
                          <View
                            pointerEvents="none"
                            className="absolute inset-0 rounded-lg"
                            style={{ borderRadius: 8, boxShadow: 'inset 0px 3px 7px rgba(31, 42, 36, 0.3)' }}
                          />
                        ) : null}
                        <ThemedText
                          type="smallBold"
                          themeColor={isOutsideMonth ? 'textSecondary' : 'text'}
                          style={isSelected ? { color: theme.backgroundElement } : undefined}>
                          {date.getDate()}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </MonthAnimatedRow>
            ))}
          </View>
        </Animated.View>
      ))}
    </Animated.View>
  );

  return (
    <View
      ref={containerRef}
      className="min-w-0 max-w-full overflow-hidden rounded-xl px-3 pt-2"
      onLayout={() => {
        containerRef.current?.measureInWindow((x, y, width, height) => {
          if (sidebarSwipeExclusion) sidebarSwipeExclusion.current = { x, y, width, height };
        });
      }}
      style={{ alignSelf: 'stretch', backgroundColor: theme.backgroundElement, minWidth: 0 }}>
      <View {...motion.panHandlers}>
        <View className="h-9 flex-row items-center justify-between px-1">
          <ThemedText type="smallBold">{headerTitle ?? motion.monthLabel}</ThemedText>
          {headerTrailing}
        </View>
        <View className="w-full min-w-0 flex-row">
          {weekdays.map((weekday) => (
            <View key={weekday} className="h-[30px] items-center justify-center" style={{ flex: 1 }}>
              <ThemedText type="small" themeColor="textSecondary">{weekday}</ThemedText>
            </View>
          ))}
        </View>
        <Animated.View
          className="w-full min-w-0 overflow-hidden"
          onLayout={motion.onGridLayout}
          style={[motion.viewportStyle, { opacity: motion.pageWidth > 0 ? 1 : 0 }]}>
          {motion.pageWidth > 0 && motion.contentReady ? (
            <>
              <Animated.View
                pointerEvents={motion.buttonInteractive ? 'none' : 'auto'}
                style={[{ position: 'absolute', top: 0, left: 0 }, motion.monthLayerStyle]}>
                {renderTrack(motion.monthPages, true)}
              </Animated.View>
              <Animated.View
                pointerEvents={motion.buttonInteractive ? 'auto' : 'none'}
                style={[{ position: 'absolute', top: 0, left: 0 }, motion.weekLayerStyle]}>
                {renderTrack(motion.weekPages, false)}
              </Animated.View>
            </>
          ) : (
            <View className="w-full flex-row flex-wrap">
              {motion.currentMonthDates.map((date) => (
                <View key={getDateKey(date)} className="p-0.5" style={{ aspectRatio: 1, width: '14.285714%' }}>
                  <View className="flex-1 rounded-lg" style={{ backgroundColor: theme.primarySoft }} />
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </View>
      <Animated.View
        pointerEvents={motion.buttonInteractive ? 'auto' : 'none'}
        style={[{ overflow: 'hidden' }, motion.buttonContainerStyle]}>
        <Animated.View style={motion.buttonStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="展开日历"
            accessibilityState={{ expanded: false }}
            hitSlop={12}
            onPress={() => motion.animateVerticalTo(0)}
            className="mx-1 mt-1.5 h-5 flex-row items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: theme.primarySoft }}>
            <View className="h-0.5 w-9 rounded-full" style={{ backgroundColor: theme.textSecondary }} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
