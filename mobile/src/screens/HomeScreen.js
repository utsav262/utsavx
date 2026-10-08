import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Search, SlidersHorizontal, Ticket } from 'lucide-react-native';
import { api } from '../api';
import { listOf } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { EventRow, FeaturedCard } from '../components/EventCards';
import EventImage from '../components/EventImage';
import Gradient from '../components/Gradient';
import {
  Avatar,
  Chip,
  EmptyState,
  IconButton,
  Loader,
  Notice,
  SectionHeader,
} from '../components/ui';
import { colors, radius, text } from '../theme';
import { plural } from '../lib/format';
import { eventKey } from '../lib/events';

const FEATURED_COUNT = 5;

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const [eventsRes, categoriesRes, citiesRes] = await Promise.allSettled([
      api.events({ page: 1, length: 12 }),
      api.categories(),
      api.cityCounts({ limit: 10 }),
    ]);
    if (eventsRes.status === 'fulfilled') {
      setEvents(listOf(eventsRes.value));
      setError('');
    } else {
      setError(eventsRes.reason?.message || 'Could not load events.');
    }
    if (categoriesRes.status === 'fulfilled')
      setCategories(listOf(categoriesRes.value));
    if (citiesRes.status === 'fulfilled') setCities(listOf(citiesRes.value));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api
        .notifications()
        .then(res => alive && setUnread(Number(res?.unread || 0)))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const explore = params =>
    navigation.navigate('Explore', { ...params, at: Date.now() });
  const firstName = String(user?.name || '').split(' ')[0] || 'there';
  const featured = events.slice(0, FEATURED_COUNT);
  const more = events.slice(FEATURED_COUNT);

  return (
    <View style={styles.screen}>
      {/* Fixed top bar — content scrolls under it, never under the status bar */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Pressable
          onPress={() => navigation.navigate('Account')}
          accessibilityRole="button"
          accessibilityLabel="Account"
        >
          <Avatar user={user} size={46} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.hello}>Hello, {firstName} 👋</Text>
          <Text style={text.h2}>Let's find your vibe</Text>
        </View>
        <IconButton
          icon={Bell}
          label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          badge={unread}
          onPress={() => navigation.navigate('Notifications')}
        />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Search size={19} color={colors.textFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => explore({ q: query.trim() })}
              placeholder="Search events, artists, venues"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              returnKeyType="search"
              style={styles.searchInput}
              accessibilityLabel="Search events"
            />
          </View>
          <Pressable
            onPress={() => explore({ q: query.trim() })}
            style={styles.filter}
            accessibilityRole="button"
            accessibilityLabel="Filters"
          >
            <Gradient style={[StyleSheet.absoluteFill, styles.filterRadius]} />
            <SlidersHorizontal size={20} color={colors.white} />
          </Pressable>
        </View>

        {/* Categories */}
        {categories.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip label="All" active onPress={() => explore({})} />
            {categories.map(category => (
              <Chip
                key={category.slug || category.name}
                label={category.name}
                onPress={() => explore({ category: category.name })}
              />
            ))}
          </ScrollView>
        ) : null}

        {loading ? <Loader style={styles.loader} /> : null}
        {!loading && error ? (
          <View style={styles.pad}>
            <Notice tone="error">{error} Pull down to try again.</Notice>
          </View>
        ) : null}
        {!loading && !error && !events.length ? (
          <EmptyState
            icon={Ticket}
            title="New events are on the way"
            message="Nothing is on sale right now. Check back soon."
          />
        ) : null}

        {/* Featured */}
        {featured.length ? (
          <View style={styles.section}>
            <SectionHeader
              style={styles.pad}
              title="Upcoming events"
              onAction={() => explore({})}
            />
            <FlatList
              horizontal
              data={featured}
              keyExtractor={item => String(eventKey(item))}
              renderItem={({ item }) => <FeaturedCard event={item} />}
              showsHorizontalScrollIndicator={false}
              snapToInterval={296}
              decelerationRate="fast"
              contentContainerStyle={styles.rail}
            />
          </View>
        ) : null}

        {/* Cities */}
        {cities.length ? (
          <View style={styles.section}>
            <SectionHeader style={styles.pad} title="Popular cities" />
            <FlatList
              horizontal
              data={cities}
              keyExtractor={item => item.city}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cityRail}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => explore({ city: item.city })}
                  style={styles.city}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.city}, ${plural(
                    item.count,
                    'event',
                  )}`}
                >
                  <View style={styles.cityRing}>
                    <EventImage
                      uri={item.image_url}
                      seed={item.city}
                      category="city"
                      iconSize={24}
                      style={styles.cityImage}
                    />
                  </View>
                  <Text style={styles.cityName} numberOfLines={1}>
                    {item.city}
                  </Text>
                  <Text style={styles.cityCount}>
                    {plural(item.count, 'event')}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}

        {/* More */}
        {more.length ? (
          <View style={[styles.section, styles.pad]}>
            <SectionHeader
              title="More to explore"
              onAction={() => explore({})}
            />
            {more.map(event => (
              <EventRow
                key={eventKey(event)}
                event={event}
                style={styles.rowGap}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 2, paddingBottom: 28 },
  flex: { flex: 1 },
  pad: { paddingHorizontal: 20 },
  loader: { paddingVertical: 60 },
  header: {
    paddingBottom: 14,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  hello: { ...text.small, marginBottom: 2 },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  filter: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRadius: { borderRadius: 16 },
  chips: { gap: 8, paddingHorizontal: 20, paddingTop: 16 },
  section: { marginTop: 28 },
  rail: { gap: 16, paddingHorizontal: 20 },
  cityRail: { gap: 18, paddingHorizontal: 20 },
  city: { width: 76, alignItems: 'center' },
  cityRing: {
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cityImage: { width: 66, height: 66, borderRadius: 33 },
  cityName: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  cityCount: { fontSize: 11, color: colors.textFaint },
  rowGap: { marginBottom: 12 },
});
