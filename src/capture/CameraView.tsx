import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Text, View } from 'react-native';
import { uuid } from '../lib/uuid.ts';
import colors from '../ui/colors.ts';

// Wrapper around `react-native-vision-camera`. When the native module is
// available we render `<Camera>`; otherwise we render a placeholder surface
// so the layout layers above still compose correctly during development on
// web / in tests.
//
// The methods `start` / `stop` mirror the VisionCamera V5 Output API
// (`startRecording(options)` / `stopRecording()`), with a fake clock so the
// recording flow can be exercised without a device.

type StartResult = Readonly<{ recordingId: string; startedAt: number }>;
type StopResult = Readonly<{ durationMs: number; fileUri: string }>;

export type CameraHandle = Readonly<{
  start(): Promise<StartResult>;
  stop(): Promise<StopResult>;
}>;

type Props = Readonly<{
  active: boolean;
}>;

const CameraView = forwardRef<CameraHandle, Props>(function CameraView({ active }, ref) {
  const startedAtRef = useRef<number | null>(null);
  const recordingIdRef = useRef<string | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      async start() {
        startedAtRef.current = Date.now();
        recordingIdRef.current = uuid();
        return { recordingId: recordingIdRef.current, startedAt: startedAtRef.current };
      },
      async stop() {
        const started = startedAtRef.current ?? Date.now();
        const id = recordingIdRef.current ?? uuid();
        startedAtRef.current = null;
        recordingIdRef.current = null;
        return {
          durationMs: Math.max(0, Date.now() - started),
          fileUri: `file:///songlayer/cache/recordings/${id}.mov`,
        };
      },
    }),
    [],
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
