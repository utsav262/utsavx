import React from 'react';
import { Image, StyleSheet } from 'react-native';

const MARK = require('../assets/brand/logo-mark.png'); // 560 × 650
const FULL = require('../assets/brand/logo-full.png'); // 1080 × 920

/** UtsavX logo cut out of src/assets/images/monochrome.png. `full` adds the wordmark. */
export default function Logo({ size = 64, full = false, style }) {
  const ratio = full ? 1080 / 920 : 560 / 650;
  return (
    <Image
      source={full ? FULL : MARK}
      style={[styles.image, { width: size * ratio, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="UtsavX"
    />
  );
}

const styles = StyleSheet.create({
  image: { alignSelf: 'center' },
});
