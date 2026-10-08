import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { api } from './api';
import RootNavigator from './navigation/RootNavigator';
import SplashScreen from './components/SplashScreen';
import { colors } from './theme';

const MIN_SPLASH_MS = 1600;

function Root() {
  const { ready } = useAuth();
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [splashGone, setSplashGone] = useState(false);

  useEffect(() => {
    api.wake();
    const timer = setTimeout(() => setMinTimePassed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  const finishSplash = useCallback(() => setSplashGone(true), []);

  return (
    <View style={styles.root}>
      {ready ? <RootNavigator /> : null}
      {splashGone ? null : (
        <SplashScreen done={ready && minTimePassed} onFinish={finishSplash} />
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <AuthProvider>
        <CartProvider>
          <Root />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
