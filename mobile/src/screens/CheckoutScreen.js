import React, { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Building2,
  CircleCheck,
  Clock,
  CreditCard,
  Lock,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
} from 'lucide-react-native';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import EventImage from '../components/EventImage';
import RazorpayCheckout from '../components/RazorpayCheckout';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Notice,
  ScreenHeader,
} from '../components/ui';
import { HOLD_MINUTES } from '../config';
import { colors, radius, text } from '../theme';
import { money, plural } from '../lib/format';

/**
 * A fresh id per checkout attempt. Retrying the same attempt reuses the pending order
 * (and its seat hold); a later purchase of the same tickets gets a new order.
 */
const newAttemptId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function groupByEvent(items) {
  const groups = new Map();
  for (const item of items) {
    groups.set(item.eventId, [...(groups.get(item.eventId) || []), item]);
  }
  return groups;
}

export default function CheckoutScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { items, count, total, removeEvent } = useCart();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [payment, setPayment] = useState(null);
  const pendingPayment = useRef(null);
  const attemptId = useRef(newAttemptId());

  if (!items.length && !busy) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Checkout" />
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          action={
            <Button
              title="Explore events"
              onPress={() => navigation.navigate('Tabs', { screen: 'Explore' })}
            />
          }
        />
      </View>
    );
  }

  // Resolves when the Razorpay sheet reports back.
  const payWithRazorpay = intent =>
    new Promise((resolve, reject) => {
      pendingPayment.current = { resolve, reject };
      setPayment(intent);
    });

  const handleRazorpayResult = result => {
    const pending = pendingPayment.current;
    pendingPayment.current = null;
    setPayment(null);
    if (!pending) return;
    if (result?.type === 'success') pending.resolve(result.data);
    else pending.reject(new Error(result?.message || 'Payment cancelled.'));
  };

  const submit = async () => {
    setBusy(true);
    setMessage('');
    let booked = 0;
    try {
      for (const [eventId, group] of groupByEvent(items)) {
        const fingerprint = group
          .map(item => `${item.ticketTypeId}:${item.quantity}`)
          .sort()
          .join('|');
        const response = await api.createOrder({
          eventId,
          items: group.map(item => ({
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
          })),
          idempotencyKey: `app:${user.id}:${eventId}:${fingerprint}:${attemptId.current}`,
        });
        const order = response?.order || response?.result;
        const orderId = order?._id || order?.id;

        // Free orders and local demo mode come back already paid.
        if (response?.paymentRequired) {
          if (!orderId)
            throw new Error('Order was created but payment could not start.');
          const intent = (await api.createIntent(orderId))?.result;
          if (intent?.status !== 'paid') {
            if (intent?.provider !== 'razorpay') {
              throw new Error(
                'Online payments are unavailable right now. Please try again later or contact support.',
              );
            }
            const paid = await payWithRazorpay(intent);
            await api.verifyRazorpay({
              bookingOrderId: intent.bookingOrderId || orderId,
              razorpay_order_id: paid.razorpay_order_id,
              razorpay_payment_id: paid.razorpay_payment_id,
              razorpay_signature: paid.razorpay_signature,
            });
          }
        }
        removeEvent(eventId);
        booked += 1;
      }

      attemptId.current = newAttemptId();
      navigation.popToTop();
      navigation.navigate('Tabs', { screen: 'Tickets' });
      Alert.alert("You're in! 🎉", 'Your tickets are ready in My tickets.');
    } catch (error) {
      // 410 = the seat hold expired; the next tap should start a new order.
      if (error.status === 410) attemptId.current = newAttemptId();
      setMessage(
        `${
          booked
            ? 'Some of your tickets were booked and are in My tickets. '
            : ''
        }${error.message || 'Checkout could not be completed.'}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Checkout" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Notice tone="warn">
          Seats are held for {HOLD_MINUTES} minutes once you tap Pay.
        </Notice>

        {/* Order */}
        <Text style={styles.heading}>Your order</Text>
        <Card style={styles.card}>
          {items.map((item, index) => (
            <View
              key={item.id}
              style={[styles.line, index > 0 && styles.lineBorder]}
            >
              <EventImage
                uri={item.image}
                seed={item.title}
                category={item.category}
                iconSize={20}
                style={styles.thumb}
              />
              <View style={styles.flex}>
                <Text style={styles.lineTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.lineMeta}>
                  {item.ticketName} · {item.quantity} × {money(item.price)}
                  {Number(item.admits) > 1
                    ? ` · admits ${item.admits} each`
                    : ''}
                </Text>
              </View>
              <Text style={styles.linePrice}>
                {money(item.price * item.quantity)}
              </Text>
            </View>
          ))}
        </Card>

        {/* Contact */}
        <Text style={styles.heading}>Tickets go to</Text>
        <Card style={[styles.card, styles.contact]}>
          <Avatar user={user} size={44} />
          <View style={styles.flex}>
            <Text style={styles.lineTitle}>{user.name}</Text>
            <Text style={styles.lineMeta} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
          <CircleCheck size={20} color={colors.success} />
        </Card>

        {/* Payment */}
        <Text style={styles.heading}>Pay with</Text>
        <View style={styles.methods}>
          <Method icon={Smartphone} label="UPI" />
          <Method icon={CreditCard} label="Card" />
          <Method icon={Building2} label="Netbanking" />
        </View>
        <View style={styles.secure}>
          <ShieldCheck size={14} color={colors.success} />
          <Text style={styles.secureText}>
            Secured by Razorpay · 256-bit encryption
          </Text>
        </View>

        {/* Bill */}
        <Card style={styles.bill}>
          <Row
            label={`Tickets (${plural(count, 'item')})`}
            value={money(total)}
          />
          <Row label="Booking fee" value="FREE" highlight />
          <View style={styles.divider} />
          <Row label="Total" value={money(total)} strong />
        </Card>

        {message ? (
          <Notice tone="error" style={styles.gap}>
            {message}
          </Notice>
        ) : null}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.flex}>
          <Text style={text.caption}>Total</Text>
          <Text style={styles.total}>{money(total)}</Text>
        </View>
        <Button
          title="Pay securely"
          icon={busy ? Clock : Lock}
          loading={busy}
          onPress={submit}
          style={styles.pay}
        />
      </View>

      <RazorpayCheckout payment={payment} onResult={handleRazorpayResult} />
    </View>
  );
}

function Method({ icon: Icon, label }) {
  return (
    <View style={styles.method}>
      <View style={styles.methodIcon}>
        <Icon size={20} color={colors.primary} />
      </View>
      <Text style={styles.methodText}>{label}</Text>
    </View>
  );
}

function Row({ label, value, strong, highlight }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.rowStrong]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          strong && styles.rowStrong,
          highlight && styles.rowFree,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  heading: { ...text.h3, marginTop: 24, marginBottom: 12 },
  card: { padding: 14 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineBorder: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  lineTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  lineMeta: { ...text.small, marginTop: 2 },
  linePrice: { fontSize: 15, fontWeight: '800', color: colors.text },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methods: { flexDirection: 'row', gap: 10 },
  method: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  methodText: { fontSize: 13, fontWeight: '700', color: colors.text },
  secure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  secureText: { ...text.caption },
  bill: { padding: 16, gap: 10, marginTop: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { ...text.small },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowStrong: { fontSize: 17, fontWeight: '800', color: colors.text },
  rowFree: { color: colors.success },
  divider: { height: 1, backgroundColor: colors.border },
  gap: { marginTop: 16 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  total: { fontSize: 22, fontWeight: '800', color: colors.text },
  pay: { minWidth: 170 },
});
