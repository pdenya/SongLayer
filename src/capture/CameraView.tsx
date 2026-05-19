import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Text, View } from 'react-native';
import colors from '../ui/colors.ts';
import { CameraEngine, type StartResult, type StopResult } from './cameraEngine.ts';

// Wrapper around `react-native-vision-camera`. When the native module is
// available we render `<Camera>`; otherwise we render a placeholder surface
// so the layout layers above still compose correctly during development on
// web / in tests. The lifecycle is owned by `CameraEngine`, which is
// unit-testable.

export type CameraHandle = Readonly<{
  start(): Promise<Omit<StartResult, never>>;
  stop(): Promise<Pick<StopResult, 'durationMs' | 'fileUri'>>;
}>;

type Props = Readonly<{
  active: boolean;
}>;

const CameraView = forwardRef<CameraHandle, Props>(function CameraView({ active }, ref) {
  const engineRef = useRef<CameraEngine | null>(null);
  if (engineRef.current == null) {
    engineRef.current = new CameraEngine();
  }
  const engine = engineRef.current;

  useImperativeHandle(
    ref,
    () => ({
      async start() {
        return engine.start();
      },
      async stop() {
        const result = engine.stop();
        return { durationMs: result.durationMs, fileUri: result.fileUri };
      },
    }),
    [engine],
  );

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: active ? colors.surface : colors.slotBg,
        borderColor: active ? colors.accent : colors.border,
        borderWidth: active ? 2 : 1,
        flex: 1,
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.mutedText }}>{active ? 'Recording' : 'Camera preview'}</Text>
    </View>
  );
});

export default CameraView;
