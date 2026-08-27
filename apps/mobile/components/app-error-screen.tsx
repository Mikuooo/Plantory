import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { createCorrelationId, reportError } from '@/observability/logger';

export function AppErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reference = useRef(createCorrelationId('render-error'));
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    reportError(error, 'app.render.failed', {}, reference.current);
  }, [error]);

  const retryRoute = async () => {
    setRetrying(true);
    try {
      await retry();
    } catch (retryError) {
      reportError(retryError, 'app.render.retry_failed', {}, reference.current);
      setRetrying(false);
    }
  };

  return (
    <ThemedView
      accessibilityRole="alert"
      className="flex-1 items-center justify-center px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="w-full max-w-[420px] items-center gap-4">
        <ThemedText type="title">页面暂时无法显示</ThemedText>
        <ThemedText themeColor="textSecondary" className="text-center">
          错误已经记录。你可以重试，现有本地数据不会因此被清除。
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" selectable>
          错误编号：{reference.current}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="重试加载页面"
          disabled={retrying}
          onPress={retryRoute}
          className="mt-2 min-h-12 min-w-[160px] items-center justify-center rounded-lg px-5 active:opacity-70"
          style={{ backgroundColor: theme.primary, opacity: retrying ? 0.6 : 1 }}>
          <ThemedText type="smallBold" style={{ color: theme.backgroundElement }}>
            {retrying ? '正在重试…' : '重试'}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}
