import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';
import { setAuthToken, setUnauthorizedHandler } from '../api/client';
import {
  KEYS,
  readJson,
  readString,
  removeKeys,
  writeJson,
} from '../lib/storage';

const AuthContext = createContext(null);

export const CUSTOMER_ONLY_MESSAGE =
  'This app is for ticket buyers. Organizer and admin accounts can sign in on the UtsavX website.';

const isCustomer = user => user?.role === 'customer';

export function AuthProvider({ children }) {
  const [state, setState] = useState({ ready: false, user: null });

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    setState({ ready: true, user: null });
    await removeKeys(KEYS.token, KEYS.user);
  }, []);

  // Restore the saved session, then refresh it from /auth/me.
  useEffect(() => {
    let alive = true;
    setUnauthorizedHandler(() => {
      clearSession();
    });

    (async () => {
      const [token, cachedUser] = await Promise.all([
        readString(KEYS.token),
        readJson(KEYS.user, null),
      ]);
      if (!alive) return;
      if (!token || !isCustomer(cachedUser)) {
        if (token) await clearSession();
        else setState({ ready: true, user: null });
        return;
      }

      setAuthToken(token);
      setState({ ready: true, user: cachedUser });
      try {
        const fresh = (await api.me())?.result;
        if (!alive) return;
        if (!isCustomer(fresh)) {
          await clearSession();
          return;
        }
        setState({ ready: true, user: fresh });
        writeJson(KEYS.user, fresh);
      } catch {
        // Offline: keep the cached session. A 401 already cleared it via the handler.
      }
    })();

    return () => {
      alive = false;
      setUnauthorizedHandler(null);
    };
  }, [clearSession]);

  const startSession = useCallback(async response => {
    const user = response?.user || response?.result;
    const token = response?.token;
    if (!user || !token)
      throw new Error('Unexpected response from the server.');
    if (!isCustomer(user)) throw new Error(CUSTOMER_ONLY_MESSAGE);

    setAuthToken(token);
    try {
      await AsyncStorage.setMany({
        [KEYS.token]: token,
        [KEYS.user]: JSON.stringify(user),
      });
    } catch {
      // Session still works for this launch.
    }
    setState({ ready: true, user });
    return user;
  }, []);

  const signIn = useCallback(
    (email, password) =>
      api
        .login({ email: email.trim().toLowerCase(), password })
        .then(startSession),
    [startSession],
  );

  const signUp = useCallback(
    ({ name, email, password }) =>
      api
        .register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        })
        .then(startSession),
    [startSession],
  );

  const signOut = useCallback(async () => {
    api.logout().catch(() => {}); // reads the token before clearSession runs
    await clearSession();
  }, [clearSession]);

  /** Merge profile changes (name, avatar…) into the saved user. */
  const updateUser = useCallback(patch => {
    setState(current => {
      if (!current.user) return current;
      const user = { ...current.user, ...patch };
      writeJson(KEYS.user, user);
      return { ...current, user };
    });
  }, []);

  const value = useMemo(
    () => ({
      ready: state.ready,
      user: state.user,
      signIn,
      signUp,
      signOut,
      updateUser,
    }),
    [state, signIn, signUp, signOut, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
