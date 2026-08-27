import { useLocalSearchParams } from 'expo-router';

import { PotFormScreen } from '@/components/pots/pot-form-screen';

export default function EditPotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PotFormScreen potId={id} />;
}
