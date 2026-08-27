import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, type LayoutChangeEvent } from 'react-native';
import {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  addDays,
  getDateFromKey,
  getDateKey,
  getMonth,
  getWeek,
  getWeekAnchor,
} from '@/components/calendar/calendar-date-utils';
import type { CalendarProps } from '@/components/calendar/calendar-types';

const pageOffsets = [-1, 0, 1] as const;
const swipeThreshold = 0.22;
const swipeVelocityThreshold = 0.35;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function useCalendarMotion({
  selectedDate,
  onSelectDate,
  expanded,
  onExpandedChange,
}: Pick<CalendarProps, 'selectedDate' | 'onSelectDate' | 'expanded' | 'onExpandedChange'>) {
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

  useEffect(() => { visibleDateRef.current = visibleDate; }, [visibleDate]);
  useEffect(() => { expandedRef.current = expanded; }, [expanded]);
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
  useEffect(() => { if (pageWidth > 0) setContentReady(true); }, [pageWidth]);

  const finishVerticalAnimation = useCallback((target: 0 | 1) => {
    const nextExpanded = target === 0;
    expandedRef.current = nextExpanded;
    setButtonInteractive(!nextExpanded);
    onExpandedChange(nextExpanded);
  }, [onExpandedChange]);

  const animateVerticalTo = useCallback((target: 0 | 1) => {
    if (target === 0) setButtonInteractive(false);
    collapseProgress.value = withTiming(
      target,
      { duration: 320, easing: Easing.out(Easing.cubic) },
      (finished) => { if (finished) runOnJS(finishVerticalAnimation)(target); },
    );
  }, [collapseProgress, finishVerticalAnimation]);

  const beginVerticalGesture = useCallback(() => {
    cancelAnimation(collapseProgress);
    gestureStartProgressRef.current = collapseProgress.value;
  }, [collapseProgress]);

  const updateVerticalGesture = useCallback((translationY: number) => {
    if (translationY > 0 && expandedRef.current === false) setButtonInteractive(false);
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
      (finished) => { if (finished) runOnJS(commitHorizontalPage)(direction); },
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
      if (!expandedRef.current) horizontalWeekAnchorRef.current = currentWeekAnchorRef.current;
    },
    onPanResponderMove: (_, gesture) => {
      if (!gestureDirectionRef.current) {
        gestureDirectionRef.current = Math.abs(gesture.dx) > Math.abs(gesture.dy)
          ? 'horizontal'
          : 'vertical';
      }
      if (gestureDirectionRef.current === 'horizontal') {
        horizontalOffset.value = clamp(horizontalStartRef.current + gesture.dx, -pageWidth, pageWidth);
      } else {
        updateVerticalGesture(gesture.dy);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (gestureDirectionRef.current === 'horizontal') endHorizontalGesture(gesture.dx, gesture.vx);
      else endVerticalGesture(gesture.vy);
      gestureDirectionRef.current = null;
    },
    onPanResponderTerminate: (_, gesture) => {
      if (gestureDirectionRef.current === 'horizontal') endHorizontalGesture(gesture.dx, gesture.vx);
      else endVerticalGesture(gesture.vy);
      gestureDirectionRef.current = null;
    },
  }), [beginVerticalGesture, endHorizontalGesture, endVerticalGesture, horizontalOffset, pageWidth, updateVerticalGesture]);

  const viewportStyle = useAnimatedStyle(() => ({
    height: interpolate(collapseProgress.value, [0, 1], [expandedGridHeight.value, cellSize.value]),
  }));
  const monthGridStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -collapseRowIndex * cellSize.value * collapseProgress.value }],
  }));
  const monthLayerStyle = useAnimatedStyle(() => ({ opacity: 1 }));
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
    return { anchor, dates: getMonth(anchor), offset };
  }), [visibleDate]);
  const weekPages = useMemo(() => pageOffsets.map((offset) => {
    const anchor = addDays(weekAnchor, offset * 7);
    return { anchor, dates: getWeek(anchor), offset };
  }), [weekAnchor]);

  const selectDate = useCallback((date: Date) => {
    visibleDateRef.current = date;
    setVisibleDate(date);
    onSelectDate(getDateKey(date));
  }, [onSelectDate]);

  const onGridLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0 && Math.abs(nextWidth - pageWidth) > 0.5) {
      const nextCellSize = nextWidth / 7;
      cellSize.value = nextCellSize;
      expandedGridHeight.value = getMonth(visibleDateRef.current).length / 7 * nextCellSize;
      horizontalOffset.value = 0;
      setPageWidth(nextWidth);
    }
  }, [cellSize, expandedGridHeight, horizontalOffset, pageWidth]);

  return {
    animateVerticalTo,
    beginVerticalGesture,
    buttonContainerStyle,
    buttonInteractive,
    buttonStyle,
    collapseProgress,
    collapseRowIndex,
    contentReady,
    currentMonthDates,
    endVerticalGesture,
    monthGridStyle,
    monthLabel: `${visibleDate.getFullYear()}年 ${visibleDate.getMonth() + 1}月`,
    monthLayerStyle,
    monthPages,
    onGridLayout,
    pageWidth,
    panHandlers: panResponder.panHandlers,
    selectDate,
    todayKey: getDateKey(new Date()),
    trackStyle,
    updateVerticalGesture,
    viewportStyle,
    weekLayerStyle,
    weekPages,
  };
}

export type CalendarMotionController = ReturnType<typeof useCalendarMotion>;
