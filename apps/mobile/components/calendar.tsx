import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, View } from 'react-native';
import type { ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAppSidebarSwipeExclusion } from '@/components/app-sidebar';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type CalendarProps = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  calendarImageSource?: ImageSourcePropType;
  todayStyle?: 'border' | 'inset';
  headerTrailing?: ReactNode;
  headerTitle?: string;
};

export type CalendarMotionHandle = {
  beginCollapseGesture: () => void;
  updateCollapseGesture: (translationY: number) => void;
  endCollapseGesture: (velocityY: number) => void;
};

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
const pageOffsets = [-1, 0, 1] as const;
const swipeThreshold = 0.22;
const swipeVelocityThreshold = 0.35;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getDateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function getDateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function getMondayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function getWeek(date: Date) {
  const start = addDays(date, -getMondayIndex(date));
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getWeekAnchor(date: Date) {
  return addDays(date, -getMondayIndex(date));
}

function getMonth(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayIndex = getMondayIndex(firstDay);
  const start = addDays(firstDay, -firstDayIndex);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const dayCount = Math.max(35, Math.ceil((firstDayIndex + daysInMonth) / 7) * 7);
  return Array.from({ length: dayCount }, (_, index) => addDays(start, index));
}

function MonthAnimatedRow({
  rowIndex,
  targetRowIndex,
  collapseProgress,
  children,
}: {
  rowIndex: number;
  targetRowIndex: number;
  collapseProgress: ReturnType<typeof useSharedValue<number>>;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: rowIndex === targetRowIndex
      ? 1
      : interpolate(collapseProgress.value, [0, 0.94, 1], [1, 0.28, 0], 'clamp'),
  }));

  return <Animated.View className="w-full min-w-0 flex-row" style={style}>{children}</Animated.View>;
}

export const Calendar = forwardRef<CalendarMotionHandle, CalendarProps>(function Calendar(
  { selectedDate, onSelectDate, expanded, onExpandedChange, calendarImageSource, todayStyle = 'border', headerTrailing, headerTitle },
  ref,
) {
  const theme = useTheme();
  const sidebarSwipeExclusion = useAppSidebarSwipeExclusion();
  const containerRef = useRef<View>(null);
  const [visibleDate, setVisibleDate] = useState(() => getDateFromKey(selectedDate));
  const [weekAnchor, setWeekAnchor] = useState(() => getWeekAnchor(getDateFromKey(selectedDate)));
  const [buttonInteractive, setButtonInteractive] = useState(!expanded);
  const [pageWidth, setPageWidth] = useState(0);
  const [contentReady, setContentReady] = useState(false);
  const expandedRef = useRef(expanded);
  const visibleDateRef = useRef(visibleDate);
  const currentWeekAnchorRef = useRef(getWeekAnchor(getDateFromKey(selectedDate)));
  const horizontalWeekAnchorRef = useRef(getWeekAnchor(getDateFromKey(selectedDate)));
  const gestureStartProgressRef = useRef(expanded ? 0 : 1);
  const gestureDirectionRef = useRef<'horizontal' | 'vertical' | null>(null);
  const horizontalStartRef = useRef(0);
  const pendingHorizontalDirectionRef = useRef<-1 | 1 | null>(null);
  const collapseProgress = useSharedValue(expanded ? 0 : 1);
  const horizontalOffset = useSharedValue(0);
  const cellSize = useSharedValue(1);
  const expandedGridHeight = useSharedValue(1);

  const currentMonthDates = useMemo(() => getMonth(visibleDate), [visibleDate]);
  const selectedIndex = currentMonthDates.findIndex((date) => getDateKey(date) === selectedDate);
  const visibleIndex = currentMonthDates.findIndex((date) => getDateKey(date) === getDateKey(visibleDate));
  const collapseRowIndex = Math.floor(Math.max(selectedIndex, visibleIndex, 0) / 7);

  useEffect(() => {
    visibleDateRef.current = visibleDate;
  }, [visibleDate]);

  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => () => {
    if (sidebarSwipeExclusion) sidebarSwipeExclusion.current = null;
  }, [sidebarSwipeExclusion]);

  useEffect(() => {
    if (!expanded && gestureDirectionRef.current !== 'horizontal') {
      const nextAnchor = getWeekAnchor(getDateFromKey(selectedDate));
      currentWeekAnchorRef.current = nextAnchor;
      setWeekAnchor(nextAnchor);
    }
  }, [expanded, selectedDate]);

  useEffect(() => {
    if (pageWidth <= 0) return;
    const nextGridHeight = getMonth(visibleDate).length / 7 * cellSize.value;
    expandedGridHeight.value = withTiming(
      nextGridHeight,
      { duration: 180, easing: Easing.out(Easing.cubic) },
    );
  }, [cellSize, expandedGridHeight, pageWidth, visibleDate]);

  useEffect(() => {
    if (pageWidth > 0) setContentReady(true);
  }, [pageWidth]);

  const finishVerticalAnimation = useCallback((target: 0 | 1) => {
    const nextExpanded = target === 0;
    expandedRef.current = nextExpanded;
    setButtonInteractive(!nextExpanded);
    onExpandedChange(nextExpanded);
  }, [onExpandedChange]);

  const animateVerticalTo = useCallback((target: 0 | 1) => {
    if (target === 0) {
      setButtonInteractive(false);
    }
    collapseProgress.value = withTiming(
      target,
      { duration: 320, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(finishVerticalAnimation)(target);
        }
      },
    );
  }, [collapseProgress, finishVerticalAnimation]);

  const beginVerticalGesture = useCallback(() => {
    cancelAnimation(collapseProgress);
    gestureStartProgressRef.current = collapseProgress.value;
  }, [collapseProgress]);

  const updateVerticalGesture = useCallback((translationY: number) => {
    if (translationY > 0 && expandedRef.current === false) {
      setButtonInteractive(false);
    }
    const travel = Math.max(
      (expandedGridHeight.value - cellSize.value) * 1.35,
      cellSize.value * 2.5,
    );
    collapseProgress.value = clamp(
      gestureStartProgressRef.current - translationY / travel,
      0,
      1,
    );
  }, [cellSize, collapseProgress, expandedGridHeight]);

  const endVerticalGesture = useCallback((velocityY: number) => {
    const startedExpanded = gestureStartProgressRef.current < 0.5;
    const target = startedExpanded
      ? velocityY < -0.18 || collapseProgress.value >= 0.24 ? 1 : 0
      : velocityY > 0.18 || collapseProgress.value <= 0.76 ? 0 : 1;
    animateVerticalTo(target);
  }, [animateVerticalTo, collapseProgress]);

  useImperativeHandle(ref, () => ({
    beginCollapseGesture: beginVerticalGesture,
    updateCollapseGesture: updateVerticalGesture,
    endCollapseGesture: endVerticalGesture,
  }), [beginVerticalGesture, endVerticalGesture, updateVerticalGesture]);

  const commitHorizontalPage = useCallback((direction: -1 | 1) => {
    pendingHorizontalDirectionRef.current = direction;
    if (expandedRef.current) {
      const current = visibleDateRef.current;
      const next = new Date(current.getFullYear(), current.getMonth() + direction, 1);
      visibleDateRef.current = next;
      setVisibleDate(next);
    } else {
      const next = addDays(horizontalWeekAnchorRef.current, direction * 7);
      currentWeekAnchorRef.current = next;
      setWeekAnchor(next);
      visibleDateRef.current = next;
      setVisibleDate(next);
      onSelectDate(getDateKey(next));
    }
  }, [onSelectDate]);

  useLayoutEffect(() => {
    if (pendingHorizontalDirectionRef.current !== null) {
      horizontalOffset.value = 0;
      horizontalStartRef.current = 0;
      pendingHorizontalDirectionRef.current = null;
    }
  }, [horizontalOffset, visibleDate]);

  const endHorizontalGesture = useCallback((translationX: number, velocityX: number) => {
    const effectiveTranslation = horizontalStartRef.current + translationX;
    const shouldMove = Math.abs(effectiveTranslation) > pageWidth * swipeThreshold
      || Math.abs(velocityX) > swipeVelocityThreshold;
    if (!shouldMove) {
      horizontalOffset.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
      return;
    }
    const direction: -1 | 1 = effectiveTranslation < 0 ? 1 : -1;
    horizontalOffset.value = withTiming(
      direction === 1 ? -pageWidth : pageWidth,
      { duration: 220, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(commitHorizontalPage)(direction);
        }
      },
    );
  }, [commitHorizontalPage, horizontalOffset, pageWidth]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (event, gesture) => {
      const shouldCapture = Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) > 6;
      if (shouldCapture) event.stopPropagation();
      return shouldCapture;
    },
    onPanResponderGrant: () => {
      gestureDirectionRef.current = null;
      beginVerticalGesture();
      cancelAnimation(horizontalOffset);
      horizontalStartRef.current = horizontalOffset.value;
      if (!expandedRef.current) {
        horizontalWeekAnchorRef.current = currentWeekAnchorRef.current;
      }
    },
    onPanResponderMove: (_, gesture) => {
      if (!gestureDirectionRef.current) {
        gestureDirectionRef.current = Math.abs(gesture.dx) > Math.abs(gesture.dy)
          ? 'horizontal'
          : 'vertical';
      }
      if (gestureDirectionRef.current === 'horizontal') {
        horizontalOffset.value = clamp(
          horizontalStartRef.current + gesture.dx,
          -pageWidth,
          pageWidth,
        );
      } else {
        updateVerticalGesture(gesture.dy);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (gestureDirectionRef.current === 'horizontal') {
        endHorizontalGesture(gesture.dx, gesture.vx);
      } else {
        endVerticalGesture(gesture.vy);
      }
      gestureDirectionRef.current = null;
    },
    onPanResponderTerminate: (_, gesture) => {
      if (gestureDirectionRef.current === 'horizontal') endHorizontalGesture(gesture.dx, gesture.vx);
      else endVerticalGesture(gesture.vy);
      gestureDirectionRef.current = null;
    },
  }), [
    beginVerticalGesture,
    endHorizontalGesture,
    endVerticalGesture,
    horizontalOffset,
    pageWidth,
    updateVerticalGesture,
  ]);

  const viewportStyle = useAnimatedStyle(() => ({
    height: interpolate(
      collapseProgress.value,
      [0, 1],
      [expandedGridHeight.value, cellSize.value],
    ),
  }));

  const monthGridStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -collapseRowIndex * cellSize.value * collapseProgress.value }],
  }));

  const monthLayerStyle = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  const weekLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapseProgress.value, [0, 0.94, 1], [0, 0, 1], 'clamp'),
  }));

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: horizontalOffset.value }],
  }));

  const buttonContainerStyle = useAnimatedStyle(() => ({
    height: interpolate(collapseProgress.value, [0, 1], [12, 32]),
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapseProgress.value, [0.88, 1], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(collapseProgress.value, [0.88, 1], [-4, 0]) }],
  }));

  const monthPages = useMemo(() => pageOffsets.map((offset) => {
    const anchor = new Date(visibleDate.getFullYear(), visibleDate.getMonth() + offset, 1);
    return {
      anchor,
      dates: getMonth(anchor),
      offset,
    };
  }), [visibleDate]);

  const weekPages = useMemo(() => pageOffsets.map((offset) => {
    const anchor = addDays(weekAnchor, offset * 7);
    return {
      anchor,
      dates: getWeek(anchor),
      offset,
    };
  }), [weekAnchor]);

  const monthLabel = `${visibleDate.getFullYear()}年 ${visibleDate.getMonth() + 1}月`;
  const todayKey = getDateKey(new Date());

  const renderTrack = (pages: typeof monthPages, isMonth: boolean) => (
    <Animated.View
      className="flex-row"
      style={[{ marginLeft: -pageWidth, width: pageWidth * 3 }, trackStyle]}>
      {pages.map((page) => (
        <Animated.View
          key={`${isMonth ? 'month' : 'week'}-${page.offset}-${getDateKey(page.anchor)}`}
          pointerEvents={page.offset === 0 ? 'auto' : 'none'}
          style={[{ width: pageWidth }, isMonth ? monthGridStyle : undefined]}>
          <View className="w-full min-w-0">
            {Array.from({ length: page.dates.length / 7 }, (_, rowIndex) => (
              <MonthAnimatedRow
                key={rowIndex}
                rowIndex={rowIndex}
                targetRowIndex={collapseRowIndex}
                collapseProgress={collapseProgress}>
                {page.dates.slice(rowIndex * 7, rowIndex * 7 + 7).map((date, columnIndex) => {
                  const key = getDateKey(date);
                  const isSelected = key === selectedDate;
                  const isToday = key === todayKey;
                  const isOutsideMonth = isMonth && date.getMonth() !== page.anchor.getMonth();

                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={`${date.getMonth() + 1}月${date.getDate()}日`}
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => {
                        visibleDateRef.current = date;
                        setVisibleDate(date);
                        onSelectDate(key);
                      }}
                      hitSlop={2}
                      className="min-w-0 flex-1 items-center justify-center active:opacity-60"
                      style={{ aspectRatio: 1, flexBasis: 0 }}>
                      <View
                        className="items-center justify-center overflow-hidden rounded-lg"
                        style={{
                          alignSelf: 'stretch',
                          backgroundColor: isSelected
                            ? theme.primary
                            : isOutsideMonth
                              ? theme.background
                              : theme.primarySoft,
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
                              width: pageWidth,
                              height: (page.dates.length / 7) * (pageWidth / 7),
                              left: -columnIndex * (pageWidth / 7),
                              top: -rowIndex * (pageWidth / 7),
                              opacity: isOutsideMonth ? 0.25 : 0.72,
                            }}
                          />
                        ) : null}
                        {isToday && !isSelected && todayStyle === 'inset' ? (
                          <View
                            pointerEvents="none"
                            className="absolute inset-0 rounded-lg"
                            style={{
                              borderRadius: 8,
                              boxShadow: 'inset 0px 3px 7px rgba(31, 42, 36, 0.3)',
                            }}
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
      style={{
        alignSelf: 'stretch',
        backgroundColor: theme.backgroundElement,
        minWidth: 0,
      }}>
      <View {...panResponder.panHandlers}>
        <View className="h-9 flex-row items-center justify-between px-1">
          <ThemedText type="smallBold">{headerTitle ?? monthLabel}</ThemedText>
          {headerTrailing}
        </View>

        <View className="w-full min-w-0 flex-row">
          {weekdays.map((weekday) => (
            <View
              key={weekday}
              className="h-[30px] items-center justify-center"
              style={{ flex: 1 }}>
              <ThemedText type="small" themeColor="textSecondary">{weekday}</ThemedText>
            </View>
          ))}
        </View>

        <Animated.View
          className="w-full min-w-0 overflow-hidden"
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            if (nextWidth > 0 && Math.abs(nextWidth - pageWidth) > 0.5) {
              const nextCellSize = nextWidth / 7;
              cellSize.value = nextCellSize;
              expandedGridHeight.value = getMonth(visibleDateRef.current).length / 7 * nextCellSize;
              horizontalOffset.value = 0;
              setPageWidth(nextWidth);
            }
          }}
          style={[viewportStyle, { opacity: pageWidth > 0 ? 1 : 0 }]}>
          {pageWidth > 0 && contentReady ? (
            <>
              <Animated.View
                pointerEvents={buttonInteractive ? 'none' : 'auto'}
                style={[{ position: 'absolute', top: 0, left: 0 }, monthLayerStyle]}>
                {renderTrack(monthPages, true)}
              </Animated.View>
              <Animated.View
                pointerEvents={buttonInteractive ? 'auto' : 'none'}
                style={[{ position: 'absolute', top: 0, left: 0 }, weekLayerStyle]}>
                {renderTrack(weekPages, false)}
              </Animated.View>
            </>
          ) : (
            <View className="w-full flex-row flex-wrap">
              {currentMonthDates.map((date) => (
                <View
                  key={getDateKey(date)}
                  className="p-0.5"
                  style={{ aspectRatio: 1, width: '14.285714%' }}>
                  <View className="flex-1 rounded-lg" style={{ backgroundColor: theme.primarySoft }} />
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </View>

      <Animated.View
        pointerEvents={buttonInteractive ? 'auto' : 'none'}
        style={[{ overflow: 'hidden' }, buttonContainerStyle]}>
        <Animated.View style={buttonStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="展开日历"
            accessibilityState={{ expanded: false }}
            hitSlop={12}
            onPress={() => animateVerticalTo(0)}
            className="mx-1 mt-1.5 h-5 flex-row items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: theme.primarySoft }}>
            <View className="h-0.5 w-9 rounded-full" style={{ backgroundColor: theme.textSecondary }} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
});
