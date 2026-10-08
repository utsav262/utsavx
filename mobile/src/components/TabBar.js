import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass, House, ShoppingBag, Ticket, User } from 'lucide-react-native';
import Gradient from './Gradient';
import { colors } from '../theme';

const ICONS = {
  Home: House,
  Explore: Compass,
  Cart: ShoppingBag,
  Tickets: Ticket,
  Account: User,
};

/** Bottom bar with a gradient pill behind the active icon. */
export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.title || route.name;
        const Icon = ICONS[route.name];
        const badge = options.tabBarBadge;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented)
            navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={badge ? `${label}, ${badge} items` : label}
            style={styles.item}
          >
            <View style={styles.indicator}>
              {focused ? (
                <Gradient
                  direction="horizontal"
                  style={[StyleSheet.absoluteFill, styles.indicatorRadius]}
                />
              ) : null}
              <Icon
                size={21}
                color={focused ? colors.white : colors.textFaint}
              />
              {badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, focused && styles.labelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  indicator: {
    width: 58,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorRadius: { borderRadius: 16 },
  label: { fontSize: 11, fontWeight: '700', color: colors.textFaint },
  labelActive: { color: colors.text },
  badge: {
    position: 'absolute',
    top: -3,
    right: 6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.orange,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
});
