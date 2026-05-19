import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { useLocaleContext } from 'fbtee';
import { Fragment } from 'react/jsx-runtime';

export default function AppLayout() {
  const { locale } = useLocaleContext();

  return (
    <Fragment key={locale}>
      <BottomSheetModalProvider>
        <Stack>
          <Stack.Screen
            name="(tabs)"
            options={{
              contentStyle: {
                backgroundColor: 'transparent',
              },
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="project/[id]"
            options={{
              presentation: 'card',
              title: '',
            }}
          />
          <Stack.Screen
            name="project/[id]/record"
            options={{
              presentation: 'fullScreenModal',
              title: '',
            }}
          />
          <Stack.Screen
            name="project/[id]/preview"
            options={{
              presentation: 'card',
              title: '',
            }}
          />
          <Stack.Screen
            name="project/[id]/export"
            options={{
              presentation: 'card',
              title: '',
            }}
          />
        </Stack>
      </BottomSheetModalProvider>
    </Fragment>
  );
}
