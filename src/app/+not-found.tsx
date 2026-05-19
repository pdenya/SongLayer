import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import colors from '../ui/colors.ts';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.background,
          flex: 1,
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
          <fbt desc="Screen not found title">This screen doesn&apos;t exist.</fbt>
        </Text>
        <Link href="/" style={{ marginTop: 16 }}>
          <Text style={{ color: colors.accent, fontSize: 16 }}>
            <fbt desc="Go back link">Go to home screen</fbt>
          </Text>
        </Link>
      </View>
    </>
  );
}
