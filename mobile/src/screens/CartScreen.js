import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRight,
  CalendarDays,
  ShoppingBag,
  Trash2,
} from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import EventImage from '../components/EventImage';
import {
  Button,
  EmptyState,
  Notice,
  PageHeader,
  QtyStepper,
} from '../components/ui';
import { HOLD_MINUTES } from '../config';
import { colors, radius, text } from '../theme';
import { formatShort, money, plural } from '../lib/format';

export default function CartScreen({ navigation }) {
  const { items, count, total, setQuantity, remove } = useCart();

  return (
    <View style={styles.screen}>
      <PageHeader
        title="My cart"
        subtitle={
          count ? `${plural(count, 'ticket')} selected` : 'Nothing here yet'
        }
      />
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            message="Find an event you love and add tickets — they'll wait here."
            action={
              <Button
                title="Explore events"
                onPress={() => navigation.navigate('Explore')}
              />
            }
          />
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Pressable
              onPress={() =>
                navigation.navigate('Event', { id: item.slug || item.eventId })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
            >
              <EventImage
                uri={item.image}
                seed={item.title}
                category={item.category}
                iconSize={26}
                style={styles.thumb}
              />
            </Pressable>
            <View style={styles.itemBody}>
              <View style={styles.itemTop}>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Pressable
                  onPress={() => remove(item.id)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.title}`}
                >
                  <Trash2 size={18} color={colors.textFaint} />
                </Pressable>
              </View>
              <Text style={styles.ticketName}>
                {item.ticketName}
                {Number(item.admits) > 1 ? ` · admits ${item.admits}` : ''}
              </Text>
              {item.startsAt ? (
                <View style={styles.row}>
                  <CalendarDays size={13} color={colors.textFaint} />
                  <Text style={styles.meta}>{formatShort(item.startsAt)}</Text>
                </View>
              ) : null}
              <View style={styles.itemBottom}>
                <Text style={styles.itemPrice}>
                  {money(item.price * item.quantity)}
                </Text>
                <QtyStepper
                  value={item.quantity}
                  max={item.maxQty}
                  onChange={value => setQuantity(item.id, value)}
                />
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          items.length ? (
            <Notice tone="warn" style={styles.hold}>
              Seats are held for {HOLD_MINUTES} minutes once you tap Pay.
            </Notice>
          ) : null
        }
      />
      {items.length ? (
        <View style={styles.bar}>
          <View style={styles.summaryRow}>
            <Text style={text.small}>Subtotal</Text>
            <Text style={styles.summaryValue}>{money(total)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={text.small}>Booking fee</Text>
            <Text style={styles.free}>FREE</Text>
          </View>
          <Button
            title={`Checkout · ${money(total)}`}
            iconRight={ArrowRight}
            onPress={() => navigation.navigate('Checkout')}
            style={styles.checkout}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: 20, paddingBottom: 20, flexGrow: 1 },
  item: {
    flexDirection: 'row',
    gap: 14,
    padding: 12,
    marginBottom: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 92, height: 112, borderRadius: 14 },
  itemBody: { flex: 1, gap: 4 },
  itemTop: { flexDirection: 'row', gap: 8 },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.text,
  },
  ticketName: { fontSize: 13, fontWeight: '700', color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { ...text.small },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  itemPrice: { fontSize: 16, fontWeight: '800', color: colors.text },
  hold: { marginTop: 4 },
  bar: {
    padding: 20,
    paddingBottom: 16,
    gap: 6,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  free: { fontSize: 13, fontWeight: '800', color: colors.success },
  checkout: { marginTop: 10 },
});
