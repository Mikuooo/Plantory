import { useLocalSearchParams } from 'expo-router';

import { PlantDetailV2Screen } from '@/components/plants/plant-detail-v2-screen';

export default function PlantDetailV2Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlantDetailV2Screen plantId={id} />;
}
