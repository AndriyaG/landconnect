import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { errorMessage } from "@/api/client";
import { fetchListing } from "@/api/listings";
import { ContactBar } from "@/listings/ContactBar";
import { formatArea, formatINR } from "@/listings/format";
import { ImageCarousel } from "@/listings/ImageCarousel";
import { OwnerCard } from "@/listings/OwnerCard";
import { StateView } from "@/listings/StateView";
import { useAuth } from "@/store/auth";
import { colors, Screen } from "@/theme";

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = Number(id);
  const me = useAuth((s) => s.user);
  const query = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => fetchListing(listingId),
    enabled: Number.isInteger(listingId) && listingId > 0,
  });
  const listing = query.data;

  if (!listing) {
    return (
      <Screen title="Listing" back>
        {query.isError || !query.isFetching ? (
          <StateView
            icon="alert-circle-outline"
            title="Couldn't load listing"
            text={query.error ? errorMessage(query.error) : "Listing not found"}
            action={{ label: "Try again", onPress: () => query.refetch() }}
          />
        ) : (
          <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />
        )}
      </Screen>
    );
  }

  return (
    <Screen title={listing.title} back>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ImageCarousel images={listing.images} />
        <View style={styles.content}>
          <Text style={styles.price}>{formatINR(listing.price)}</Text>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.meta}>{formatArea(listing.area_value, listing.area_unit)} · {listing.land_type}</Text>
          {listing.status === "sold" && <Text style={styles.sold}>Sold</Text>}

          <Text style={styles.section}>Location</Text>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={styles.body}>{listing.address || `${listing.lat.toFixed(4)}, ${listing.lng.toFixed(4)}`}</Text>
          </View>

          <Text style={styles.section}>Description</Text>
          <Text style={styles.body}>{listing.description || "No description provided."}</Text>

          <Text style={styles.section}>Owner</Text>
          <OwnerCard owner={listing.owner} />
        </View>
      </ScrollView>
      {me?.id !== listing.owner.id && <ContactBar owner={listing.owner} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 48 },
  scroll: { paddingBottom: 24 },
  content: { padding: 16, gap: 4 },
  price: { fontSize: 24, fontWeight: "700", color: colors.primaryDark },
  title: { fontSize: 18, fontWeight: "600", color: colors.text },
  meta: { fontSize: 14, color: colors.muted },
  sold: { alignSelf: "flex-start", marginTop: 6, color: "#fff", backgroundColor: colors.danger, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden", fontWeight: "700" },
  section: { marginTop: 18, marginBottom: 6, fontSize: 13, fontWeight: "700", color: colors.primary, textTransform: "uppercase" },
  row: { flexDirection: "row", gap: 6, alignItems: "flex-start" },
  body: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
});
