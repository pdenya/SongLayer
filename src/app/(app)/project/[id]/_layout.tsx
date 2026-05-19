import { Stack } from 'expo-router';
import colors from '../../../../ui/colors.ts';

export default function ProjectLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
      }}
    />
  );
}
