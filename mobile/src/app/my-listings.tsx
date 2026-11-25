import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet } from "react-native";

import { errorMessage } from "@/api/client";
import { fetchMyListings, type Listing } from "@/api/listings";
import { ListingCard } from "@/listings/ListingCard";
import { ListingSkeleton } from "@/listings/ListingSkeleton";
import { StateView } from "@/listings/StateView";
import { colors, Screen } from "@/theme";

const openNew = () => router.push("/listing-form");
const openEdit = (item: Listing) => router.push({ pathname: "/listing-form", params: { id: String(item.id) } });

export default function MyListingsScreen() {
  const query = useQuery({ queryKey: ["my-listings"], queryFn: fetchMyListings });

  const empty = query.isPending ? (
    <ListingSkeleton />
  ) : query.isError ? (
    <StateView
      icon="cloud-offline-outline"
      title="Couldn't load your listings"
      text={errorMessage(query.error)}
      action={{ label: "Try again", onPress: () => query.refetch() }}
    />
  ) : (
    <StateView icon="leaf-outline" title="No listings yet" text="Add your first plot of land." action={{ label: "Create listing", onPress: openNew }} />
  );

  return (
    <Screen
      title="My listings"
      back
      right={
        <Pressable accessibilityRole="button" accessibilityLabel="Create listing" hitSlop={12} onPress={openNew}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      }
    >
      <FlatList<Listing>
        data={query.data ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ListingCard item={item} onPress={openEdit} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={empty}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => {
            query.refetch();
          }} colors={[colors.primary]} />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, paddingVertical: 12 },
});
