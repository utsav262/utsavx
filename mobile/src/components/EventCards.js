import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react-native';
import EventImage from './EventImage';
import { Scrim } from './Gradient';
import { DateBadge, StatusPill } from './ui';
import { colors, radius, text } from '../theme';
import { formatDay, formatShort, formatTime, money } from '../lib/format';
import {
  eventCity,
  eventImage,
  eventKey,
  eventTitle,
  minPrice,
} from '../lib/events';

const priceLabel = event => {
  const price = minPrice(event);
  return price > 0 ? money(price) : 'Free';
};

function useOpenEvent(event) {
  const navigation = useNavigation();
  return () => navigation.navigate('Event', { id: eventKey(event) });
}

/** Tall poster card for horizontal carousels. */
export function FeaturedCard({ event, width = 280 }) {
  const open = useOpenEvent(event);
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={eventTitle(event)}
      style={({ pressed }) => [
        styles.featured,
        { width },
        pressed && styles.pressed,
      ]}
    >
      <EventImage
        uri={eventImage(event)}
        seed={eventTitle(event)}
        category={event.category}
        iconSize={56}
        style={StyleSheet.absoluteFill}
      />
      <Scrim from={0.05} to={0.92} />
      <View style={styles.featuredTop}>
        <DateBadge value={event.startsAt} />
        <StatusPill
          label={
            event.status === 'sold-out' ? 'Sold out' : event.category || 'Event'
          }
          tone="glass"
        />
      </View>
      <View style={styles.featuredBottom}>
        <Text style={styles.featuredTitle} numberOfLines={2}>
          {eventTitle(event)}
        </Text>
        <View style={styles.row}>
          <MapPin size={14} color={colors.whiteMuted} />
          <Text style={styles.featuredMeta} numberOfLines={1}>
            {eventCity(event) || 'Venue TBA'} · {formatTime(event.startsAt)}
          </Text>
        </View>
        <View style={styles.featuredFooter}>
          <Text style={styles.featuredPrice}>{priceLabel(event)}</Text>
          <View style={styles.goButton}>
            <ArrowUpRight size={18} color={colors.bg} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Full-width card with the cover on top — Explore results. */
export function EventCard({ event, style }) {
  const open = useOpenEvent(event);
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={eventTitle(event)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      <EventImage
        uri={eventImage(event)}
        seed={eventTitle(event)}
        category={event.category}
        iconSize={40}
        style={styles.cardImage}
      >
        <View style={styles.cardBadges}>
          <DateBadge value={event.startsAt} />
          {event.status === 'sold-out' ? (
            <StatusPill label="Sold out" tone="glass" />
          ) : null}
        </View>
      </EventImage>
      <View style={styles.cardBody}>
        {event.category ? (
          <Text style={styles.category}>{event.category}</Text>
        ) : null}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {eventTitle(event)}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.cardMeta}>
            <View style={styles.row}>
              <CalendarDays size={14} color={colors.textFaint} />
              <Text style={styles.meta}>
                {formatShort(event.startsAt) || 'Date TBA'}
              </Text>
            </View>
            <View style={styles.row}>
              <MapPin size={14} color={colors.textFaint} />
              <Text style={styles.meta} numberOfLines={1}>
                {eventCity(event) || 'Venue TBA'}
              </Text>
            </View>
          </View>
          <Text style={styles.price}>{priceLabel(event)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Compact row — thumbnail on the left. */
export function EventRow({ event, style }) {
  const open = useOpenEvent(event);
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={eventTitle(event)}
      style={({ pressed }) => [
        styles.rowCard,
        pressed && styles.pressed,
        style,
      ]}
    >
      <EventImage
        uri={eventImage(event)}
        seed={eventTitle(event)}
        category={event.category}
        iconSize={24}
        style={styles.thumb}
      />
      <View style={styles.rowBody}>
        <Text style={styles.rowDate}>
          {formatDay(event.startsAt) || 'Date TBA'}
        </Text>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {eventTitle(event)}
        </Text>
        <View style={styles.row}>
          <MapPin size={13} color={colors.textFaint} />
          <Text style={styles.meta} numberOfLines={1}>
            {eventCity(event) || 'Venue TBA'}
          </Text>
        </View>
      </View>
      <Text style={styles.rowPrice}>{priceLabel(event)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  featured: {
    height: 360,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  featuredTop: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featuredBottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 8,
  },
  featuredTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: colors.white,
  },
  featuredMeta: { flex: 1, fontSize: 13, color: colors.whiteMuted },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  featuredPrice: { fontSize: 18, fontWeight: '800', color: colors.white },
  goButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },

  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardImage: { height: 180 },
  cardBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardBody: { padding: 16, gap: 6 },
  category: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardTitle: { ...text.h3 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 4,
  },
  cardMeta: { flex: 1, gap: 4 },
  meta: { flexShrink: 1, fontSize: 13, color: colors.textMuted },
  price: { fontSize: 17, fontWeight: '800', color: colors.text },

  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 84, height: 84, borderRadius: 14 },
  rowBody: { flex: 1, gap: 4 },
  rowDate: { fontSize: 12, fontWeight: '800', color: colors.primary },
  rowTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.text,
  },
  rowPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    paddingRight: 6,
  },
});
