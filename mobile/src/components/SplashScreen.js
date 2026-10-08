import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BootSplash from 'react-native-bootsplash';
import { colors } from '../theme';

const ART = require('../assets/images/Splassh.png');

const hideNative = () => BootSplash.hide({ fade: true }).catch(() => {});

/**
 * Full-screen brand splash (src/assets/images/Splassh.png). The native splash
 * (logo on #00011D) hands over to this as soon as the artwork has loaded, and
 * this fades out once `done` is true.
 */
export default function SplashScreen({ done, onFinish }) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(1)).current;

  // Never leave the native splash up if the image is slow to decode.
  useEffect(() => {
    const timer = setTimeout(hideNative, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!done) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 450,
      useNativeDriver: true,
    }).start(onFinish);
  }, [done, opacity, onFinish]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity }]}
      pointerEvents={done ? 'none' : 'auto'}
    >
      <Image
        source={ART}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onLoadEnd={hideNative}
      />
      <View style={[styles.loader, { bottom: insets.bottom + 36 }]}>
        <ActivityIndicator color={colors.white} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bgDeep },
  loader: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
