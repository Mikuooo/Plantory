import { useLocalSearchParams } from 'expo-router';

import { PlantDetailScreen } from '@/components/plants/plant-detail-screen';

export default function PlantDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlantDetailScreen plantId={id} />;
}
