import { useLocalSearchParams } from 'expo-router';

import { PotDetailScreen } from '@/components/pots/pot-detail-screen';

export default function PotDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PotDetailScreen potId={id} />;
}
