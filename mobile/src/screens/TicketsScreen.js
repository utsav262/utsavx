import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarDays, MapPin, QrCode, Ticket } from 'lucide-react-native';
import { api } from '../api';
import { absoluteUrl, listOf } from '../api/client';
import EventImage from '../components/EventImage';
import {
  Button,
  EmptyState,
  Loader,
  Notice,
  PageHeader,
  Segmented,
  StatusPill,
} from '../components/ui';
import { colors, radius, text } from '../theme';
import { formatShort } from '../lib/format';
import { ticketStatus } from '../lib/tickets';

const isUpcoming = ticket =>
  !ticket.event?.startsAt || new Date(ticket.event.startsAt) >= new Date();

export default function TicketsScreen({ navigation }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('upcoming');

  const load = useCallback(async () => {
    try {
      setTickets(listOf(await api.tickets()));
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load tickets.');
    }
  }, []);

  // Reload whenever the tab comes into view (e.g. straight after checkout).
  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const upcoming = useMemo(() => tickets.filter(isUpcoming), [tickets]);
  const past = useMemo(() => tickets.filter(t => !isUpcoming(t)), [tickets]);
  const rows = tab === 'upcoming' ? upcoming : past;

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <PageHeader
        title="My tickets"
        subtitle="Show the QR code at the entrance"
      />
      <Segmented
        style={styles.segmented}
        value={tab}
        onChange={setTab}
        options={[
          { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { key: 'past', label: `Past (${past.length})` },
        ]}
      />

      {loading ? (
        <Loader />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
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
                icon={Ticket}
                title={
                  tab === 'upcoming' ? 'No upcoming tickets' : 'No past tickets'
                }
                message={
                  tab === 'upcoming'
                    ? 'Tickets you book show up here with a QR code for entry.'
                    : 'Events you have been to will show up here.'
                }
                action={
                  tab === 'upcoming' ? (
                    <Button
                      title="Find an event"
                      onPress={() => navigation.navigate('Explore')}
                    />
                  ) : null
                }
              />
            )
          }
          renderItem={({ item }) => (
            <TicketStub
              ticket={item}
              onPress={() => navigation.navigate('Ticket', { ticket: item })}
            />
          )}
        />
      )}
    </View>
  );
}

function TicketStub({ ticket, onPress }) {
  const status = ticketStatus(ticket.status);
  const event = ticket.event || {};
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.stub, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${event.title || 'Ticket'}, ${
        ticket.ticketType || ''
      }, ${status.label}`}
    >
      <View style={styles.stubTop}>
        <EventImage
          uri={absoluteUrl(event.imageUrl)}
          seed={event.title}
          category={event.category}
          iconSize={26}
          style={styles.thumb}
        />
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title || 'Event'}
          </Text>
          <View style={styles.row}>
            <CalendarDays size={13} color={colors.textFaint} />
            <Text style={styles.meta}>
              {formatShort(event.startsAt) || 'Date TBA'}
            </Text>
          </View>
          <View style={styles.row}>
            <MapPin size={13} color={colors.textFaint} />
            <Text style={styles.meta} numberOfLines={1}>
              {event.venue?.name || event.venue?.city || 'Venue TBA'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.perforation}>
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={styles.dash} />
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      <View style={styles.stubBottom}>
        <View style={styles.flex}>
          <Text style={text.caption}>Ticket</Text>
          <Text style={styles.type}>
            {ticket.ticketType || 'General Admission'}
          </Text>
        </View>
        <StatusPill label={status.label} tone={status.tone} />
        <View style={styles.qr}>
          <QrCode size={20} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.88 },
  segmented: { marginHorizontal: 20 },
  list: { padding: 20, flexGrow: 1 },
  gap: { marginBottom: 12 },
  stub: {
    marginBottom: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stubTop: { flexDirection: 'row', gap: 14, padding: 14 },
  thumb: { width: 76, height: 76, borderRadius: 14 },
  title: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  meta: { flexShrink: 1, ...text.small },
  perforation: { height: 20, justifyContent: 'center' },
  dash: {
    marginHorizontal: 18,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  notch: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notchLeft: { left: -11 },
  notchRight: { right: -11 },
  stubBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
  },
  type: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
  qr: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
});
