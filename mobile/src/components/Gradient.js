import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme';

let nextId = 0;

const DIRECTIONS = {
  diagonal: { x1: '0', y1: '0', x2: '1', y2: '1' },
  vertical: { x1: '0', y1: '0', x2: '0', y2: '1' },
  horizontal: { x1: '0', y1: '0', x2: '1', y2: '0' },
};

/**
 * react-native-svg ignores the alpha in rgba() stop colours (they render opaque),
 * so split them into stopColor + stopOpacity.
 */
function stopProps(color) {
  const match =
    /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i.exec(
      color,
    );
  if (!match) return { stopColor: color, stopOpacity: 1 };
  const [, r, g, b, a] = match;
  return { stopColor: `rgb(${r},${g},${b})`, stopOpacity: Number(a) };
}

/** Absolute-fill linear gradient behind its children. */
export default function Gradient({
  stops = colors.gradient,
  direction = 'diagonal',
  style,
  children,
}) {
  const id = useMemo(() => `gradient${(nextId += 1)}`, []);
  const last = stops.length - 1;
  return (
    <View style={[styles.box, style]}>
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id={id} {...DIRECTIONS[direction]}>
            {stops.map((color, index) => (
              <Stop
                key={color + index}
                offset={String(index / (last || 1))}
                {...stopProps(color)}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}

/** Transparent → dark fade so white text reads over photos. */
export function Scrim({ from = 0, to = 0.85 }) {
  return (
    <Gradient
      direction="vertical"
      stops={[
        `rgba(0,0,0,${from})`,
        `rgba(0,0,0,${(from + to) / 3})`,
        `rgba(0,0,0,${to})`,
      ]}
      style={StyleSheet.absoluteFill}
    />
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
});
