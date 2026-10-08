import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Inbox } from 'lucide-react-native';
import { api } from '../api';
import { listOf } from '../api/client';
import { EmptyState, Loader, Notice, ScreenHeader } from '../components/ui';
import { colors, radius, text } from '../theme';
import { timeAgo } from '../lib/format';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.notifications();
      setRows(listOf(res));
      setError('');
      // Opening the list counts as reading it; unread dots stay until the next visit.
      if (Number(res?.unread || 0) > 0)
        api.markNotificationsRead().catch(() => {});
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Notifications" />
      {loading ? (
        <Loader />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item._id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          ListHeaderComponent={
            error ? (
              <Notice tone="error" style={styles.gap}>
                {error}
              </Notice>
            ) : null
          }
          ListEmptyComponent={
            error ? null : (
              <EmptyState
                icon={Inbox}
                title="You're all caught up"
                message="Updates about your events and orders will appear here."
              />
            )
          }
          renderItem={({ item }) => (
            <View style={[styles.row, !item.readAt && styles.rowUnread]}>
              <View style={styles.icon}>
                <Bell size={18} color={colors.primary} />
              </View>
              <View style={styles.body}>
                {item.title ? (
                  <Text style={styles.title}>{item.title}</Text>
                ) : null}
                {item.message ? (
                  <Text style={styles.message}>{item.message}</Text>
                ) : null}
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.readAt ? <View style={styles.dot} /> : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 20, paddingTop: 8, flexGrow: 1 },
  gap: { marginBottom: 12 },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    marginBottom: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowUnread: { borderColor: colors.primary },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  message: { ...text.small, marginTop: 3 },
  time: { ...text.caption, marginTop: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: colors.primary,
  },
});
