import { forwardRef, useImperativeHandle } from 'react';

import { CalendarGrid } from '@/components/calendar/calendar-grid';
import type { CalendarMotionHandle, CalendarProps } from '@/components/calendar/calendar-types';
import { useCalendarMotion } from '@/components/calendar/use-calendar-motion';

export type { CalendarMotionHandle } from '@/components/calendar/calendar-types';

export const Calendar = forwardRef<CalendarMotionHandle, CalendarProps>(function Calendar(
  { selectedDate, onSelectDate, expanded, onExpandedChange, ...presentation },
  ref,
) {
  const motion = useCalendarMotion({ selectedDate, onSelectDate, expanded, onExpandedChange });

  useImperativeHandle(ref, () => ({
    beginCollapseGesture: motion.beginVerticalGesture,
    updateCollapseGesture: motion.updateVerticalGesture,
    endCollapseGesture: motion.endVerticalGesture,
  }), [motion.beginVerticalGesture, motion.endVerticalGesture, motion.updateVerticalGesture]);

  return <CalendarGrid motion={motion} selectedDate={selectedDate} {...presentation} />;
});
