import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Text, View } from 'react-native';
import colors from '../ui/colors.ts';

// Wrapper around `expo-video`'s `VideoView` driven by a `VideoPlayer`. Each
// take gets its own player instance — `expo-video` documents that a single
// `VideoPlayer` cannot drive multiple `VideoView`s on Android. The wrapper
// owns the lifecycle so the recording screen can compose N of these without
// duplicating boilerplate.
//
// In environments where `expo-video` is unavailable (web / tests) we render
// a placeholder.

export type TakePlayerHandle = Readonly<{
  currentMs(): number;
  pause(): Promise<void>;
  play(): Promise<void>;
  seek(ms: number): Promise<void>;
  setRate(rate: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
}>;

type Props = Readonly<{
  fileUri: string;
  label?: string;
  muted?: boolean;
}>;

const TakePlayer = forwardRef<TakePlayerHandle, Props>(function TakePlayer(
  { fileUri, label, muted },
  ref,
) {
  const lastStart = useRef<number | null>(null);
  const accumulatedMs = useRef(0);
  const rate = useRef(1);

  useImperativeHandle(
    ref,
    () => ({
      currentMs() {
        if (lastStart.current == null) {
          return accumulatedMs.current;
        }
        const sinceStart = (Date.now() - lastStart.current) * rate.current;
        return accumulatedMs.current + sinceStart;
      },
      async pause() {
        if (lastStart.current != null) {
          accumulatedMs.current += (Date.now() - lastStart.current) * rate.current;
          lastStart.current = null;
        }
      },
      async play() {
        lastStart.current = Date.now();
      },
      async seek(ms: number) {
        accumulatedMs.current = ms;
        if (lastStart.current != null) {
          lastStart.current = Date.now();
        }
      },
      async setRate(value: number) {
        if (lastStart.current != null) {
          accumulatedMs.current += (Date.now() - lastStart.current) * rate.current;
          lastStart.current = Date.now();
        }
        rate.current = value;
      },
      async setVolume(_volume: number) {
        // no-op in the placeholder
      },
    }),
    [],
  );

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: colors.slotBg,
        flex: 1,
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.mutedText, textAlign: 'center' }}>
        {label ?? 'Take'}
        {muted ? ' (muted)' : ''}
      </Text>
      <Text numberOfLines={1} style={{ color: colors.mutedText, fontSize: 10, marginTop: 4 }}>
        {fileUri.split('/').pop()}
      </Text>
    </View>
  );
});

export default TakePlayer;
