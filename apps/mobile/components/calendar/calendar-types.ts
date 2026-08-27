import type { ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';

export type CalendarProps = {
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
