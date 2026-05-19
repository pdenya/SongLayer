import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Text, View } from 'react-native';
import colors from '../ui/colors.ts';
import { PlayerEngine } from './playerEngine.ts';

// Wrapper around `expo-video`'s `VideoView` driven by a `VideoPlayer`. Each
// take gets its own player instance — `expo-video` documents that a single
// `VideoPlayer` cannot drive multiple `VideoView`s on Android. The wrapper
// owns the lifecycle so the recording screen can compose N of these without
// duplicating boilerplate.
//
// The timing logic lives in `PlayerEngine`, which is unit-testable.

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
  const engineRef = useRef<PlayerEngine | null>(null);
  if (engineRef.current == null) {
    engineRef.current = new PlayerEngine();
  }
  const engine = engineRef.current;

  useImperativeHandle(
    ref,
    () => ({
      currentMs() {
        return engine.currentMs();
      },
      async pause() {
        engine.pause();
      },
      async play() {
        engine.play();
      },
      async seek(ms: number) {
        engine.seek(ms);
      },
      async setRate(value: number) {
        engine.setRate(value);
      },
      async setVolume(value: number) {
        engine.setVolume(value);
      },
    }),
    [engine],
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
