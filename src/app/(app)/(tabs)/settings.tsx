import Stack, { VStack } from '@nkzw/stack';
import { useLocaleContext } from 'fbtee';
import { useTransition } from 'react';
import { Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../../../ui/colors.ts';

export default function Settings() {
  const [, startTransition] = useTransition();
  const { locale, setLocale } = useLocaleContext();

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <VStack flex1 gap={20} padding={20}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>
          <fbt desc="Settings header">Settings</fbt>
        </Text>

        <Stack gap={8}>
          <Text style={{ color: colors.mutedText, fontSize: 14 }}>
            <fbt desc="Language section heading">Language</fbt>
          </Text>
          <Pressable
            accessibilityLabel="Toggle language"
            onPress={() => startTransition(() => setLocale(locale === 'ja_JP' ? 'en_US' : 'ja_JP'))}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 10,
              padding: 14,
            }}
          >
            <Text style={{ color: colors.text }}>{locale}</Text>
          </Pressable>
        </Stack>

        <Stack gap={8}>
          <Text style={{ color: colors.mutedText, fontSize: 14 }}>
            <fbt desc="About section heading">About SongLayer</fbt>
          </Text>
          <Text style={{ color: colors.text }}>
            <fbt desc="About body">
              Record yourself singing, then sing along with yourself. SongLayer stacks layered vocal
              takes against your own performance and exports them to a multi-pane video.
            </fbt>
          </Text>
        </Stack>
      </VStack>
    </SafeAreaView>
  );
}
