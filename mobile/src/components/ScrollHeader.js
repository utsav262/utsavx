import React, { useMemo, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

/** Scroll position → 0…1 opacity between `start` and `end` pixels. */
export function useScrollFade(start, end) {
  const scrollY = useRef(new Animated.Value(0)).current;
  return useMemo(
    () => ({
      onScroll: Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        {
          useNativeDriver: true,
        },
      ),
      opacity: scrollY.interpolate({
        inputRange: [start, end],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    }),
    [scrollY, start, end],
  );
}

/**
 * Solid bar that fades in behind the status bar (and an optional title row)
 * once the page has scrolled, so content never shows under the status icons.
 */
export default function ScrollHeader({ opacity, title, barHeight = 0 }) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bar,
        { height: insets.top + barHeight, opacity },
        barHeight ? styles.withBorder : null,
      ]}
    >
      {title ? (
        <Animated.Text
          style={[styles.title, { lineHeight: barHeight }]}
          numberOfLines={1}
        >
          {title}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    backgroundColor: colors.bg,
  },
  withBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  title: {
    marginHorizontal: 72,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
});
