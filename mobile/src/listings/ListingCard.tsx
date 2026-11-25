import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { imageUrl, type Listing } from "@/api/listings";
import { colors } from "@/theme";

import { formatArea, formatINR } from "./format";
import { RoleBadge } from "./RoleBadge";

function ListingCardBase({ item, onPress }: { item: Listing; onPress?: (item: Listing) => void }) {
  const cover = item.images[0]?.url;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${formatINR(item.price)}${item.status === "sold" ? ", sold" : ""}`}
      onPress={() => (onPress ? onPress(item) : router.push({ pathname: "/listing/[id]", params: { id: String(item.id) } }))}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      {cover ? (
        <Image source={imageUrl(cover)} style={styles.image} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.image, styles.noImage]}>
          <Ionicons name="image-outline" size={40} color={colors.muted} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.price}>{formatINR(item.price)}</Text>
          {item.status === "sold" && <Text style={styles.sold}>Sold</Text>}
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.meta}>{formatArea(item.area_value, item.area_unit)} · {item.land_type}</Text>
        {!!item.address && (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text style={styles.meta} numberOfLines={1}>{item.address}</Text>
          </View>
        )}
        <View style={[styles.row, styles.owner]}>
          <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.ownerName} numberOfLines={1}>{item.owner.name}</Text>
          <RoleBadge role={item.owner.role} />
        </View>
      </View>
    </Pressable>
  );
}

export const ListingCard = memo(ListingCardBase);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 12, marginBottom: 12, overflow: "hidden", elevation: 1 },
  image: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.border },
  noImage: { alignItems: "center", justifyContent: "center" },
  body: { padding: 12, gap: 4 },
  price: { fontSize: 18, fontWeight: "700", color: colors.primaryDark },
  sold: { marginLeft: 8, color: "#fff", backgroundColor: colors.danger, paddingHorizontal: 8, borderRadius: 10, overflow: "hidden", fontWeight: "700", fontSize: 12 },
  title: { fontSize: 16, fontWeight: "600", color: colors.text },
  meta: { fontSize: 13, color: colors.muted, flexShrink: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  owner: { marginTop: 6, gap: 6 },
  ownerName: { fontSize: 14, color: colors.text, fontWeight: "500", flexShrink: 1 },
});
