import { useLocalSearchParams } from 'expo-router';

import { PlantCareRecordsScreen } from '@/components/plants/plant-care-records-screen';

export default function PlantCareRecordsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlantCareRecordsScreen plantId={id} />;
}
