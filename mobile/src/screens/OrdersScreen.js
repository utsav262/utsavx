import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Receipt } from 'lucide-react-native';
import { api } from '../api';
import { absoluteUrl, listOf } from '../api/client';
import EventImage from '../components/EventImage';
import {
  Button,
  Card,
  EmptyState,
  Loader,
  Notice,
  ScreenHeader,
  StatusPill,
} from '../components/ui';
import { colors, text } from '../theme';
import { formatDateTime, formatShort, money } from '../lib/format';
import { orderStatus } from '../lib/tickets';

export default function OrdersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setOrders(listOf(await api.orders()));
      setError('');
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
      <ScreenHeader title="My orders" />
      {loading ? (
        <Loader />
      ) : (
        <FlatList
          data={orders}
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
                icon={Receipt}
                title="No orders yet"
                message="Orders you place show up here with their payment status."
                action={
                  <Button
                    title="Explore events"
                    onPress={() =>
                      navigation.navigate('Tabs', { screen: 'Explore' })
                    }
                  />
                }
              />
            )
          }
          renderItem={({ item }) => {
            const status = orderStatus(item.status);
            const paid = item.status === 'paid';
            const lines = (item.items || [])
              .map(line => `${line.quantity} × ${line.name}`)
              .join(', ');
            return (
              <Card
                style={styles.card}
                onPress={
                  paid
                    ? () => navigation.navigate('Tabs', { screen: 'Tickets' })
                    : undefined
                }
                accessibilityLabel={`${item.event?.title || 'Order'}, ${
                  status.label
                }`}
              >
                <View style={styles.top}>
                  <EventImage
                    uri={absoluteUrl(item.event?.imageUrl)}
                    seed={item.event?.title}
                    category={item.event?.category}
                    iconSize={22}
                    style={styles.thumb}
                  />
                  <View style={styles.flex}>
                    <Text style={styles.title} numberOfLines={2}>
                      {item.event?.title || 'Event'}
                    </Text>
                    {item.event?.startsAt ? (
                      <Text style={styles.meta}>
                        {formatShort(item.event.startsAt)}
                      </Text>
                    ) : null}
                    {lines ? <Text style={styles.meta}>{lines}</Text> : null}
                  </View>
                </View>
                <View style={styles.bottom}>
                  <View style={styles.flex}>
                    <Text style={styles.number}>{item.orderNumber}</Text>
                    <Text style={text.caption}>
                      {formatDateTime(item.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.total}>
                      {item.total > 0
                        ? money(item.total, item.currency)
                        : 'Free'}
                    </Text>
                    <StatusPill label={status.label} tone={status.tone} />
                  </View>
                </View>
                {item.status === 'cancelled' ? (
                  <Text style={styles.note}>
                    This order wasn't paid, so its seats were released.
                  </Text>
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  list: { padding: 20, paddingTop: 8, flexGrow: 1 },
  gap: { marginBottom: 12 },
  card: { padding: 14, marginBottom: 12 },
  top: { flexDirection: 'row', gap: 12 },
  thumb: { width: 60, height: 60, borderRadius: 12 },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.text,
  },
  meta: { ...text.small, marginTop: 2 },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  number: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 2,
  },
  right: { alignItems: 'flex-end', gap: 6 },
  total: { fontSize: 16, fontWeight: '800', color: colors.text },
  note: { ...text.caption, marginTop: 10 },
});
