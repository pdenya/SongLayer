import { createMMKV } from 'react-native-mmkv';
import { uuid } from './uuid.ts';

const DEVICE_ID_KEY = 'songlayer.deviceId';

let cached: string | null = null;

export function getOrCreateDeviceId(): string {
  if (cached) {
    return cached;
  }
  const storage = createMMKV({ id: 'songlayer-app' });
  let id = storage.getString(DEVICE_ID_KEY);
  if (!id) {
    id = uuid();
    storage.set(DEVICE_ID_KEY, id);
  }
  cached = id;
  return id;
}

export function resetDeviceIdCacheForTests(): void {
  cached = null;
}
