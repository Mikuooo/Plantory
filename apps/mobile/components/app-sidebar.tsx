import { useRouter } from 'expo-router';
import { createContext, type MutableRefObject, type ReactElement, type ReactNode, useCallback, useContext, useMemo, useRef } from 'react';
import { Image, PanResponder, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { assetCategories } from '@/components/asset-config';
import { AppIcon } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useAssetStore } from '@/stores/asset-store';
import { useSidebarStore } from '@/stores/sidebar-store';

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
  const sidebarOpen = useSidebarStore((state) => state.open);
  const setSidebarOpen = useSidebarStore((state) => state.setOpen);
  const drawerWidth = width;
  const drawerWidthRef = useRef(drawerWidth);
  drawerWidthRef.current = drawerWidth;
  const drawerX = useSharedValue(sidebarOpen ? drawerWidth : 0);
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
    setSidebarOpen(open);
  }, [drawerX, setSidebarOpen]);
  const drawerPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => (
      sidebarOpen
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
      return horizontal && (sidebarOpen
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
  }), [drawerX, gestureStartX, sidebarOpen, settle]);
  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: drawerX.value - drawerWidth }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: interpolate(drawerX.value, [0, drawerWidth], [0, 1]) }));
  const contextValue = useMemo(() => ({
    open: () => Platform.OS === 'web' ? setSidebarOpen(true) : settle(true),
    swipeExclusionRectRef,
  }), [setSidebarOpen, settle]);

  if (Platform.OS === 'web') {
    return (
      <SidebarContext.Provider value={contextValue}>
        <View className="h-full flex-1 overflow-hidden" style={{ width, maxWidth: width }}>
          {children}
          {sidebarOpen ? <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭侧边栏"
            onPress={() => setSidebarOpen(false)}
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.38)' }}
          /> : null}
          <View
            pointerEvents={sidebarOpen ? 'auto' : 'none'}
            className="absolute top-0 bottom-0 left-0"
            style={[{
              width: drawerWidth,
              backgroundColor: theme.backgroundElement,
            }, { transform: [{ translateX: sidebarOpen ? 0 : -drawerWidth }] }]}>
            <SidebarContent onClose={() => setSidebarOpen(false)} />
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
            {sidebarOpen ? <Pressable accessibilityRole="button" accessibilityLabel="关闭侧边栏" onPress={() => settle(false)} className="absolute inset-0" style={{ backgroundColor: 'transparent' }} /> : null}
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
      accessibilityLabel={sidebar ? '打开资产侧边栏' : 'Plantory 头像'}
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
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const assets = useAssetStore((state) => state.items);

  const navigate = (href: (typeof assetCategories)[number]['href']) => {
    router.push(href);
  };

  return (
    <ThemedView type="background" className="h-full w-full flex-1">
      <View className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="min-h-[72px] flex-row items-center justify-end px-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭侧边栏"
            hitSlop={8}
            onPress={onClose}
            className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: theme.backgroundElement }}>
            <AppIcon name="close" color={theme.text} size={24} />
          </Pressable>
        </View>

        <ThemedText type="small" themeColor="textSecondary" className="mx-5 mt-2 mb-2 w-full">资产</ThemedText>
        <View className="mx-4 overflow-hidden rounded-2xl" style={{ backgroundColor: theme.backgroundElement }}>
          {assetCategories.map((category) => {
            const count = assets.filter((item) => item.category === category.category).length;
            return (
              <Pressable
                key={category.category}
                accessibilityRole="button"
                accessibilityLabel={`进入${category.label}资产页面，共 ${count} 项`}
                onPress={() => navigate(category.href)}
                className="h-[56px] flex-row items-center gap-4 px-5 active:opacity-70">
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.primarySoft }}>
                  <AppIcon name={category.icon} color={theme.primary} size={20} />
                </View>
                <View
                  className="min-w-0 flex-1 self-stretch justify-center"
                  style={category === assetCategories[assetCategories.length - 1]
                    ? undefined
                    : { borderBottomWidth: 1, borderBottomColor: theme.border }}>
                  <ThemedText
                    type="smallBold"
                    className="w-full">
                    {category.label}
                  </ThemedText>
                </View>
                <AppIcon name="chevronRight" color={theme.textSecondary} size={21} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </ThemedView>
  );
}
