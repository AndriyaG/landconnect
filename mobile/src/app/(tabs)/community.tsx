import Ionicons from "@expo/vector-icons/Ionicons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet } from "react-native";

import { errorMessage } from "@/api/client";
import { fetchListings, PAGE_SIZE, type Listing } from "@/api/listings";
import { ListingCard } from "@/listings/ListingCard";
import { ListingSkeleton } from "@/listings/ListingSkeleton";
import { PriceFilterBar } from "@/listings/PriceFilterBar";
import { PRICE_FILTERS } from "@/listings/priceFilters";
import { SearchBar } from "@/listings/SearchBar";
import { StateView } from "@/listings/StateView";
import { useDebounced } from "@/listings/useDebounced";
import { canList, useAuth } from "@/store/auth";
import { colors, Screen } from "@/theme";

export default function CommunityScreen() {
  const showCreate = useAuth((s) => canList(s.user));
  const [search, setSearch] = useState("");
  const [priceId, setPriceId] = useState("any");
  const q = useDebounced(search.trim());
  const price = PRICE_FILTERS.find((f) => f.id === priceId) ?? PRICE_FILTERS[0];
  const filters = { q, min_price: price.min, max_price: price.max };

  const query = useInfiniteQuery({
    queryKey: ["listings", filters],
    queryFn: ({ pageParam }) => fetchListings(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE),
  });
  const items = query.data?.pages.flat() ?? [];
  const filtered = !!q || priceId !== "any";

  const empty = query.isPending ? (
    <ListingSkeleton />
  ) : query.isError ? (
    <StateView
      icon="cloud-offline-outline"
      title="Couldn't load listings"
      text={errorMessage(query.error)}
      action={{ label: "Try again", onPress: () => query.refetch() }}
    />
  ) : filtered ? (
    <StateView
      icon="search-outline"
      title="No matching listings"
      text="Try a different search or price range."
      action={{ label: "Clear filters", onPress: () => { setSearch(""); setPriceId("any"); } }}
    />
  ) : (
    <StateView icon="leaf-outline" title="No listings yet" text="New land listings will appear here." />
  );

  return (
    <Screen
      title="Community"
      right={
        showCreate && (
          <Pressable accessibilityRole="button" accessibilityLabel="Create listing" hitSlop={12} onPress={() => router.push("/listing-form")}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        )
      }
    >
      <SearchBar value={search} onChange={setSearch} />
      <PriceFilterBar value={priceId} onChange={setPriceId} />
      <FlatList<Listing>
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ListingCard item={item} />}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={empty}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : undefined}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => {
              query.refetch();
            }}
            colors={[colors.primary]}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, paddingBottom: 16 },
  footer: { marginVertical: 16 },
});
