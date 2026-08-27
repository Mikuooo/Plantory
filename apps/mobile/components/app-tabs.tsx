import { BlurTargetView, BlurView } from 'expo-blur';
import {
  Tabs,
  TabList,
  TabSlot,
  TabTrigger,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import type { Href } from 'expo-router';
import { useRef, type RefObject } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { useResolvedColorScheme } from '@/hooks/use-resolved-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { appNavigationRoutes } from '@/components/navigation-config';

const TAB_BAR_HEIGHT = 56;

export default function AppTabs() {
  const blurTargetRef = useRef<View | null>(null);
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      className="h-full w-full min-w-0 max-w-full flex-1 overflow-hidden"
      style={{ flex: 1, minWidth: 0, maxWidth: '100%' }}>
      <BlurTargetView
        ref={blurTargetRef}
        className="min-w-0 flex-1"
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: '100%',
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom,
        }}>
        <TabSlot
          className="min-w-0 flex-1"
          style={{ flex: 1, minWidth: 0, maxWidth: '100%' }}
        />
      </BlurTargetView>
      <TabList asChild>
        <CustomTabList blurTarget={blurTargetRef}>
          {appNavigationRoutes.map((route) => (
            <TabTrigger key={route.href} name={route.tabName} href={route.href as Href} asChild>
              <TabButton icon={route.icon}>{route.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  children,
  icon,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: AppIconName }) {
  const theme = useTheme();
  const label = String(children);

  return (
    <Pressable
      {...props}
      accessibilityLabel={label}
      className="h-14 overflow-hidden active:opacity-70"
      style={{ flex: 1, flexBasis: 0, minWidth: 0, width: 0 }}>
      <View className="h-full w-full min-w-0 items-center justify-center gap-0.5">
        <AppIcon
          name={icon}
          size={22}
          color={isFocused ? theme.primary : theme.textSecondary}
        />
        <ThemedText
          type="smallBold"
          className="text-xs/4"
          themeColor={isFocused ? 'primary' : 'textSecondary'}
          numberOfLines={1}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

type CustomTabListProps = TabListProps & {
  blurTarget: RefObject<View | null>;
};

function CustomTabList({ blurTarget, ...props }: CustomTabListProps) {
  const colorScheme = useResolvedColorScheme();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <BlurView
      {...props}
      blurMethod="dimezisBlurViewSdk31Plus"
      blurTarget={blurTarget}
      intensity={55}
      tint={colorScheme === 'dark' ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
      className="absolute right-0 bottom-0 left-0 w-full max-w-full overflow-hidden"
      style={{
        backgroundColor: `${theme.backgroundElement}A6`,
        paddingBottom: insets.bottom,
      }}>
      <View
        className="w-full min-w-0 flex-row items-center overflow-hidden px-1"
        style={{ height: TAB_BAR_HEIGHT }}>
        {props.children}
      </View>
    </BlurView>
  );
}
