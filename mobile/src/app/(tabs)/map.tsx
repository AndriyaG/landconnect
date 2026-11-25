import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { errorMessage } from "@/api/client";
import { fetchListingsInBbox, MAP_LIMIT } from "@/api/listings";
import { formatShortINR } from "@/listings/format";
import { useDebounced } from "@/listings/useDebounced";
import { BENGALURU } from "@/map/leafletHtml";
import { LeafletMap, type LeafletMapHandle, type MapMessage } from "@/map/LeafletMap";
import { colors, Screen } from "@/theme";

async function userPosition() {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) return null;
  const pos =
    (await Location.getLastKnownPositionAsync()) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

export default function MapScreen() {
  const mapRef = useRef<LeafletMapHandle>(null);
  const [bbox, setBbox] = useState<string | null>(null);
  const debouncedBbox = useDebounced(bbox, 500);

  const query = useQuery({
    queryKey: ["listings", "map", debouncedBbox],
    queryFn: () => fetchListingsInBbox(debouncedBbox!),
    enabled: debouncedBbox !== null,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    let alive = true;
    userPosition()
      .then((p) => p && alive && mapRef.current?.call("setView", p.lat, p.lng, 13))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!query.data) return;
    const markers = query.data.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, label: formatShortINR(l.price) }));
    mapRef.current?.call("setMarkers", markers);
  }, [query.data]);

  const onMessage = (msg: MapMessage) => {
    if (msg.type === "bounds") setBbox(msg.bbox);
    else if (msg.type === "open") router.push({ pathname: "/listing/[id]", params: { id: String(msg.id) } });
  };

  const count = query.data?.length ?? 0;
  const status = query.isError
    ? errorMessage(query.error)
    : count >= MAP_LIMIT
      ? `Showing ${MAP_LIMIT} listings. Zoom in to see more.`
      : query.data && count === 0
        ? "No listings in this area"
        : null;

  return (
    <Screen title="Map">
      <View style={styles.map} accessibilityLabel="Listings map. Pan or zoom to load listings, tap a price to open it.">
        <LeafletMap ref={mapRef} options={{ mode: "browse", center: BENGALURU, zoom: 12 }} onMessage={onMessage} />
        {query.isFetching && (
          <ActivityIndicator style={styles.spinner} color={colors.primary} accessibilityLabel="Loading listings" />
        )}
        {status && (
          <View style={styles.banner} pointerEvents="none" accessibilityLiveRegion="polite">
            <Text style={[styles.bannerText, query.isError && styles.error]}>{status}</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  spinner: { position: "absolute", top: 12, right: 12, padding: 6, borderRadius: 16, backgroundColor: colors.surface },
  banner: { position: "absolute", top: 12, left: 56, right: 56, alignItems: "center" },
  bannerText: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surface, color: colors.text, fontSize: 13, overflow: "hidden", elevation: 2 },
  error: { color: colors.danger },
});
