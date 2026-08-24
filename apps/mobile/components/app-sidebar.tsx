import { usePathname, useRouter } from 'expo-router';
import { createContext, type MutableRefObject, type ReactElement, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/icons';
import { appNavigationRoutes, type AppRoute } from '@/components/navigation-config';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

const DRAWER_ACTIVATION_DISTANCE = 14;
const DRAWER_FLING_VELOCITY = 700;

export type AppSidebarSwipeExclusionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SidebarContextValue = {
  open: () => void;
  swipeExclusionRectRef: MutableRefObject<AppSidebarSwipeExclusionRect | null>;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function AppSidebar({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const [webOpen, setWebOpen] = useState(false);
  const [nativeOpen, setNativeOpen] = useState(false);
  const drawerWidth = width;
  const drawerWidthRef = useRef(drawerWidth);
  drawerWidthRef.current = drawerWidth;
  const drawerX = useSharedValue(0);
  const gestureStartX = useSharedValue(0);
  const swipeExclusionRectRef = useRef<AppSidebarSwipeExclusionRect | null>(null);
  const settle = useCallback((open: boolean, velocity = 0) => {
    drawerX.value = withSpring(open ? drawerWidthRef.current : 0, {
      damping: 30,
      stiffness: 320,
      mass: 0.8,
      velocity,
      overshootClamping: true,
    });
    setNativeOpen(open);
  }, [drawerX]);
  const drawerPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => (
      nativeOpen
      && gesture.dx < -DRAWER_ACTIVATION_DISTANCE
      && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15
    ),
    onMoveShouldSetPanResponder: (event, gesture) => {
      const rect = swipeExclusionRectRef.current;
      const { pageX, pageY } = event.nativeEvent;
      if (rect
        && pageX >= rect.x
        && pageX <= rect.x + rect.width
        && pageY >= rect.y
        && pageY <= rect.y + rect.height) {
        return false;
      }
      const horizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15;
      return horizontal && (nativeOpen
        ? gesture.dx < -DRAWER_ACTIVATION_DISTANCE
        : gesture.dx > DRAWER_ACTIVATION_DISTANCE);
    },
    onPanResponderGrant: () => {
      gestureStartX.value = drawerX.value;
    },
    onPanResponderMove: (_, gesture) => {
      drawerX.value = Math.max(0, Math.min(drawerWidthRef.current, gestureStartX.value + gesture.dx));
    },
    onPanResponderRelease: (_, gesture) => {
      const velocityX = gesture.vx * 1000;
      const shouldOpen = Math.abs(velocityX) >= DRAWER_FLING_VELOCITY
        ? velocityX > 0
        : drawerX.value > drawerWidthRef.current * 0.45;
      settle(shouldOpen, velocityX);
    },
    onPanResponderTerminate: (_, gesture) => {
      settle(drawerX.value > drawerWidthRef.current * 0.45, gesture.vx * 1000);
    },
  }), [drawerX, gestureStartX, nativeOpen, settle]);
  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: drawerX.value - drawerWidth }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: interpolate(drawerX.value, [0, drawerWidth], [0, 1]) }));
  const contextValue = useMemo(() => ({
    open: () => Platform.OS === 'web' ? setWebOpen(true) : settle(true),
    swipeExclusionRectRef,
  }), [settle]);

  if (Platform.OS === 'web') {
    return (
      <SidebarContext.Provider value={contextValue}>
        <View className="h-full flex-1 overflow-hidden" style={{ width, maxWidth: width }}>
          {children}
          {webOpen ? <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭侧边栏"
            onPress={() => setWebOpen(false)}
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.38)' }}
          /> : null}
          <View
            pointerEvents={webOpen ? 'auto' : 'none'}
            className="absolute top-0 bottom-0 left-0"
            style={[{
              width: drawerWidth,
              backgroundColor: theme.backgroundElement,
            }, { transform: [{ translateX: webOpen ? 0 : -drawerWidth }] }]}>
            <SidebarContent onClose={() => setWebOpen(false)} />
          </View>
        </View>
      </SidebarContext.Provider>
    );
  }

  return (
    <SidebarContext.Provider value={contextValue}>
      <GestureHandlerRootView className="h-full w-full flex-1">
          <View className="h-full w-full flex-1" {...drawerPanResponder.panHandlers}>
            {children}
            {nativeOpen ? <Pressable accessibilityRole="button" accessibilityLabel="关闭侧边栏" onPress={() => settle(false)} className="absolute inset-0" style={{ backgroundColor: 'transparent' }} /> : null}
            <Animated.View pointerEvents="none" className="absolute inset-0" style={[{ backgroundColor: 'rgba(0, 0, 0, 0.38)' }, overlayStyle]} />
            <Animated.View className="absolute top-0 bottom-0 left-0" style={[{ width: drawerWidth, backgroundColor: theme.backgroundElement }, drawerStyle]}>
              <SidebarContent onClose={() => settle(false)} />
            </Animated.View>
          </View>
      </GestureHandlerRootView>
    </SidebarContext.Provider>
  );
}

export function AppSidebarNativeGestureBoundary({ children }: { children: ReactElement }) {
  return children;
}

export function useAppSidebarSwipeExclusion() {
  return useContext(SidebarContext)?.swipeExclusionRectRef ?? null;
}

export function AppSidebarAvatarButton() {
  const sidebar = useContext(SidebarContext);

  return (
    <Pressable
      accessibilityRole={sidebar ? 'button' : 'image'}
      accessibilityLabel={sidebar ? '打开个人侧边栏' : 'Plantory 头像'}
      disabled={!sidebar}
      hitSlop={8}
      onPress={sidebar?.open}
      className="h-11 w-11 items-center justify-center active:opacity-70">
      <Image
        accessibilityLabel="Plantory 头像"
        source={require('@/assets/images/icon.png')}
        resizeMode="cover"
        style={{ width: 36, height: 36, borderRadius: 18 }}
      />
    </Pressable>
  );
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const navigate = (href: AppRoute) => {
    onClose();
    router.navigate(href);
  };

  return (
    <ThemedView type="backgroundElement" className="h-full w-full flex-1">
      <View className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View
          className="min-h-[88px] flex-row items-center border-b px-6"
          style={{ borderBottomColor: theme.border }}>
          <View className="flex-1 gap-1">
            <ThemedText type="subtitle">Plantory</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">我的植物空间</ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭侧边栏"
            hitSlop={8}
            onPress={onClose}
            className="h-11 w-11 items-center justify-center active:opacity-70">
            <AppIcon name="close" color={theme.text} size={24} />
          </Pressable>
        </View>

        <View accessibilityRole="menu" className="gap-1 px-4 py-4">
          {appNavigationRoutes.map((route) => {
            const selected = pathname === route.href;
            return (
              <Pressable
                key={route.href}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                onPress={() => navigate(route.href)}
                className="min-h-[52px] flex-row items-center gap-4 rounded-lg px-4 active:opacity-70"
                style={selected ? { backgroundColor: theme.backgroundSelected } : undefined}>
                <AppIcon
                  name={route.icon}
                  color={selected ? theme.primary : theme.textSecondary}
                  size={24}
                />
                <ThemedText
                  type="smallBold"
                  themeColor={selected ? 'primary' : 'text'}>
                  {route.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ThemedView>
  );
}
