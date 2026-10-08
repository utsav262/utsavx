import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { MapPin, Search, SearchX, X } from 'lucide-react-native';
import { api } from '../api';
import { listOf } from '../api/client';
import { EventCard } from '../components/EventCards';
import {
  Button,
  Chip,
  EmptyState,
  Loader,
  Notice,
  PageHeader,
} from '../components/ui';
import { colors } from '../theme';
import { eventKey } from '../lib/events';

const PAGE_SIZE = 10;
// Values the API understands as `eventType` (server/src/controllers/eventController.js).
const WHEN = ['Any time', 'This Weekend', 'Next Weekend', 'This Month'];

export default function ExploreScreen({ route }) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(null);
  const [when, setWhen] = useState(WHEN[0]);
  const [city, setCity] = useState(null);
  const [categories, setCategories] = useState([]);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  // Home hands over a search, category or city; start from exactly that filter.
  const params = route.params;
  useEffect(() => {
    if (!params?.at) return;
    setInput(params.q || '');
    setQuery(params.q || '');
    setCategory(params.category || null);
    setCity(params.city || null);
    setWhen(WHEN[0]);
  }, [params]);

  useEffect(() => {
    api
      .categories()
      .then(res => setCategories(listOf(res)))
      .catch(() => {});
  }, []);

  const fetchPage = useCallback(
    async pageNo => {
      const id = ++requestId.current;
      try {
        const res = await api.events({
          page: pageNo,
          length: PAGE_SIZE,
          q: query || undefined,
          category: category || undefined,
          eventType: when === WHEN[0] ? undefined : when,
          city: city || undefined,
        });
        if (id !== requestId.current) return;
        const rows = listOf(res);
        setItems(current => {
          if (pageNo === 1) return rows;
          const seen = new Set(current.map(eventKey));
          return [...current, ...rows.filter(row => !seen.has(eventKey(row)))];
        });
        setPage(pageNo);
        setHasNext(Boolean(res?.pagination?.has_next_page));
        setError('');
      } catch (e) {
        if (id === requestId.current) setError(e.message);
      }
    },
    [query, category, when, city],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchPage(1).finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [fetchPage]);

  const loadMore = async () => {
    if (!hasNext || loading || loadingMore) return;
    setLoadingMore(true);
    await fetchPage(page + 1);
    setLoadingMore(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchPage(1);
    setRefreshing(false);
  };

  const clearAll = () => {
    setInput('');
    setQuery('');
    setCategory(null);
    setWhen(WHEN[0]);
    setCity(null);
  };

  const filtered = Boolean(query || category || city || when !== WHEN[0]);

  return (
    <View style={styles.screen}>
      <PageHeader title="Explore" subtitle="Find something to do tonight" />

      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Search size={19} color={colors.textFaint} />
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => setQuery(input.trim())}
            placeholder="Search events, artists, venues"
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.primary}
            returnKeyType="search"
            style={styles.searchInput}
            accessibilityLabel="Search events"
          />
          {input ? (
            <Pressable
              onPress={() => {
                setInput('');
                setQuery('');
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <X size={18} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {city ? (
            <Chip
              label={city}
              icon={MapPin}
              active
              onPress={() => setCity(null)}
            />
          ) : null}
          {WHEN.map(option => (
            <Chip
              key={option}
              label={option}
              active={when === option}
              onPress={() => setWhen(option)}
            />
          ))}
        </ScrollView>
        {categories.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip
              label="All categories"
              active={!category}
              onPress={() => setCategory(null)}
            />
            {categories.map(item => (
              <Chip
                key={item.slug || item.name}
                label={item.name}
                active={category === item.name}
                onPress={() =>
                  setCategory(category === item.name ? null : item.name)
                }
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {loading ? (
        <Loader />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(eventKey(item))}
          renderItem={({ item }) => (
            <EventCard event={item} style={styles.card} />
          )}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
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
              <Notice tone="error" style={styles.card}>
                {error}
              </Notice>
            ) : null
          }
          ListEmptyComponent={
            error ? null : (
              <EmptyState
                icon={SearchX}
                title="No events found"
                message={
                  filtered
                    ? 'Try a different search or clear the filters.'
                    : 'Nothing is on sale right now. Check back soon.'
                }
                action={
                  filtered ? (
                    <Button
                      title="Clear filters"
                      variant="outline"
                      onPress={clearAll}
                    />
                  ) : null
                }
              />
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.primary} style={styles.more} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  searchWrap: { paddingHorizontal: 20 },
  search: {
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
  chips: { gap: 8, paddingHorizontal: 20, paddingTop: 12 },
  list: { padding: 20, paddingBottom: 32, flexGrow: 1 },
  card: { marginBottom: 16 },
  more: { paddingVertical: 16 },
});
