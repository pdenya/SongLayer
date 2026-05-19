import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo } from 'react';
import { createMMKV } from 'react-native-mmkv';
import { getOrCreateDeviceId } from '../lib/deviceId.ts';

type LocalSettingKey = 'localSettingExample' | 'currentProjectId' | 'lastLayoutId';

const [ViewerContext, useViewerContext] = createContextHook(() => {
  const userId = useMemo(() => getOrCreateDeviceId(), []);

  const storage = useMemo(
    () =>
      createMMKV({
        id: `$userData${userId}$localSettings`,
      }),
    [userId],
  );

  const getLocalSetting = useCallback(
    (name: LocalSettingKey) => {
      return storage.getString(name) || null;
    },
    [storage],
  );

  const setLocalSetting = useCallback(
    (name: LocalSettingKey, value: string | null) => {
      if (value == null) {
        storage.remove(name);
      } else {
        storage.set(name, value);
      }
    },
    [storage],
  );

  return {
    getLocalSetting,
    isAuthenticated: true,
    setLocalSetting,
    user: { id: userId },
  };
});

export function useLocalSettings() {
  const { getLocalSetting, setLocalSetting } = useViewerContext();
  return [getLocalSetting, setLocalSetting] as const;
}

export { ViewerContext };
export default useViewerContext;
