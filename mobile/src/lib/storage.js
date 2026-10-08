import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  token: 'utsavx_token',
  user: 'utsavx_user',
  cart: 'utsavx_cart',
};

export async function readJson(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is a convenience; the app keeps working in memory.
  }
}

export async function readString(key) {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function removeKeys(...keys) {
  try {
    await AsyncStorage.removeMany(keys);
  } catch {
    // ignore
  }
}
