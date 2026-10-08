import React, { useCallback, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  ChevronRight,
  KeyRound,
  LifeBuoy,
  LogOut,
  Pencil,
  Receipt,
} from 'lucide-react-native';
import { api } from '../api';
import { listOf } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Gradient from '../components/Gradient';
import ScrollHeader, { useScrollFade } from '../components/ScrollHeader';
import { Avatar } from '../components/ui';
import { APP_NAME } from '../config';
import { colors, radius, text } from '../theme';

const appVersion = require('../../package.json').version;

export default function AccountScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  // Status-bar backdrop appears once the gradient header scrolls under it.
  const { onScroll, opacity: barOpacity } = useScrollFade(60, 140);
  const { user, signOut, updateUser } = useAuth();
  const [stats, setStats] = useState({ tickets: null, orders: null });

  // Refresh the profile (changes made on the website) and the counters.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api
        .profile()
        .then(res => {
          const p = res?.result;
          if (alive && p)
            updateUser({
              name: p.name,
              phone: p.phone,
              avatarUrl: p.avatarUrl,
            });
        })
        .catch(() => {});
      Promise.allSettled([api.tickets(), api.orders()]).then(
        ([tickets, orders]) => {
          if (!alive) return;
          setStats({
            tickets:
              tickets.status === 'fulfilled'
                ? listOf(tickets.value).length
                : null,
            orders:
              orders.status === 'fulfilled'
                ? listOf(orders.value).length
                : null,
          });
        },
      );
      return () => {
        alive = false;
      };
    }, [updateUser]),
  );

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'Your cart stays on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <Gradient style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <Avatar user={user} size={84} ring />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Pressable
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.edit}
            accessibilityRole="button"
          >
            <Pencil size={14} color={colors.white} />
            <Text style={styles.editText}>Edit profile</Text>
          </Pressable>
        </Gradient>

        <View style={styles.stats}>
          <Stat
            label="Tickets"
            value={stats.tickets}
            onPress={() => navigation.navigate('Tickets')}
          />
          <View style={styles.statDivider} />
          <Stat
            label="Orders"
            value={stats.orders}
            onPress={() => navigation.navigate('Orders')}
          />
        </View>

        <View style={styles.group}>
          <Row
            icon={Receipt}
            label="My orders"
            onPress={() => navigation.navigate('Orders')}
          />
          <Row
            icon={Bell}
            label="Notifications"
            onPress={() => navigation.navigate('Notifications')}
          />
          <Row
            icon={KeyRound}
            label="Change password"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <Row
            icon={LifeBuoy}
            label="Help & support"
            onPress={() => navigation.navigate('Help')}
            last
          />
        </View>

        <View style={styles.group}>
          <Row
            icon={LogOut}
            label="Sign out"
            onPress={confirmSignOut}
            danger
            last
          />
        </View>

        <Text style={styles.footer}>
          {APP_NAME} · v{appVersion}
        </Text>
      </Animated.ScrollView>
      <ScrollHeader opacity={barOpacity} />
    </View>
  );
}

function Stat({ label, value, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.stat}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value ?? ''}`}
    >
      <Text style={styles.statValue}>{value ?? '–'}</Text>
      <Text style={text.caption}>{label}</Text>
    </Pressable>
  );
}

function Row({ icon: Icon, label, onPress, danger, last }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      android_ripple={{ color: colors.surfaceAlt }}
      style={[styles.row, !last && styles.rowBorder]}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Icon size={18} color={danger ? colors.danger : colors.primary} />
      </View>
      <Text style={[styles.rowLabel, danger && styles.danger]}>{label}</Text>
      {danger ? null : <ChevronRight size={18} color={colors.textFaint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
  hero: {
    alignItems: 'center',
    paddingBottom: 52,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  name: { ...text.h2, marginTop: 14 },
  email: { fontSize: 14, color: colors.whiteMuted, marginTop: 2 },
  edit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  editText: { fontSize: 13, fontWeight: '700', color: colors.white },
  stats: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -32,
    paddingVertical: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statDivider: { width: 1, backgroundColor: colors.border },
  group: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  rowIconDanger: { backgroundColor: colors.dangerSoft },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  danger: { color: colors.danger },
  footer: { marginTop: 24, textAlign: 'center', ...text.caption },
});
