import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppIcon } from '@/components/icons';
import { HeaderBar } from '@/components/header-bar';
import { BackButton } from '@/components/pots/pot-list-screen';
import { getPlantName, plantCareRecords, type PlantCareRecord } from '@/components/plants/plant-care-data';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export function PlantCareRecordsScreen({ plantId }: { plantId?: string }) {
  const router = useRouter();
  const theme = useTheme();
  const plantName = getPlantName(plantId);

  return (
    <ThemedView className="flex-1">
      <HeaderBar
        title="养护记录"
        subtitle={plantName}
        leading={<BackButton onPress={() => router.back()} />}
        navigation
      />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {plantCareRecords.length === 0 ? (
          <View className="min-h-24 items-center justify-center">
            <ThemedText themeColor="textSecondary">暂无养护记录</ThemedText>
          </View>
        ) : (
          <View className="rounded-xl px-4" style={{ backgroundColor: theme.backgroundElement }}>
            {plantCareRecords.map((record) => <CareRecordRow key={`${record.day}-${record.type}`} record={record} />)}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function CareRecordRow({ record }: { record: PlantCareRecord }) {
  const theme = useTheme();
  return (
    <View className="min-h-20 flex-row items-center gap-3 border-b" style={{ borderBottomColor: theme.border }}>
      <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.primarySoft }}>
        <AppIcon name={record.icon} size={18} color={theme.primary} />
      </View>
      <View>
        <ThemedText type="smallBold">{record.day} 日 · {record.type}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{record.detail}</ThemedText>
      </View>
    </View>
  );
}
