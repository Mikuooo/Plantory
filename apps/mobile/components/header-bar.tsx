import { Pressable, View } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type HeaderBarProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  profileName?: string;
  transparent?: boolean;
  navigation?: boolean;
};

export function HeaderBar({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  leading,
  trailing,
  profileName = 'Plantory',
  transparent = false,
  navigation = false,
}: HeaderBarProps) {
  const insets = useSafeAreaInsets();
  const pageContext = subtitle ? `${title} · ${subtitle}` : title;

  return (
    <ThemedView
      type="backgroundElement"
      className={`w-full max-w-full flex-row items-center gap-3 overflow-hidden px-6 ${transparent ? 'absolute left-0 right-0 top-0 z-10' : ''}`}
      style={{
        height: 56 + insets.top,
        paddingTop: insets.top,
        backgroundColor: transparent ? 'transparent' : undefined,
      }}>
      <View className="h-11 w-11 shrink-0 items-center justify-center">{leading}</View>
      {navigation ? (
        <View pointerEvents="none" className="absolute right-20 left-20 bottom-0 h-14 items-center justify-center">
          <ThemedText className="text-base/6 font-semibold" numberOfLines={1}>{title}</ThemedText>
        </View>
      ) : (
        <View className="min-w-0 flex-1">
          <ThemedText className="text-base/6 font-semibold" numberOfLines={1}>{profileName}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{pageContext}</ThemedText>
        </View>
      )}
      {navigation ? <View className="min-w-0 flex-1" /> : null}
      {trailing ? (
        <View className="min-h-11 shrink-0 items-end justify-center">{trailing}</View>
      ) : actionLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onActionPress}
          className="min-h-11 shrink-0 justify-center px-2 active:opacity-70">
          <ThemedText type="smallBold" themeColor="primary">{actionLabel}</ThemedText>
        </Pressable>
      ) : <View className="w-[52px] shrink-0" />}
    </ThemedView>
  );
}
