import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet } from "react-native";

import { errorMessage } from "@/api/client";
import { fetchListing } from "@/api/listings";
import { ListingEditor } from "@/listings/ListingEditor";
import { StateView } from "@/listings/StateView";
import { useAuth } from "@/store/auth";
import { colors, Screen } from "@/theme";

export default function ListingFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const listingId = id ? Number(id) : null;
  const me = useAuth((s) => s.user);
  const query = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => fetchListing(listingId!),
    enabled: listingId !== null,
  });

  if (listingId === null) return <ListingEditor />;
  if (query.data && query.data.owner.id === me?.id) return <ListingEditor listing={query.data} />;

  return (
    <Screen title="Edit listing" back>
      {query.isPending ? (
        <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />
      ) : query.data ? (
        <StateView icon="lock-closed-outline" title="Not your listing" text="Only the owner can edit this listing." />
      ) : (
        <StateView
          icon="alert-circle-outline"
          title="Couldn't load listing"
          text={errorMessage(query.error)}
          action={{ label: "Try again", onPress: () => query.refetch() }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 48 },
});
