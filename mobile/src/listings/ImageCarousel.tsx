import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useState } from "react";
import { FlatList, StyleSheet, useWindowDimensions, View } from "react-native";

import { imageUrl, type Listing } from "@/api/listings";
import { colors } from "@/theme";

export function ImageCarousel({ images }: { images: Listing["images"] }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const height = (width * 3) / 4;

  if (images.length === 0) {
    return (
      <View style={[styles.empty, { height }]} accessibilityLabel="No photos">
        <Ionicons name="image-outline" size={56} color={colors.muted} />
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(img) => String(img.id)}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          <Image
            source={imageUrl(item.url)}
            style={{ width, height }}
            contentFit="cover"
            transition={150}
            accessibilityLabel={`Photo ${i + 1} of ${images.length}`}
          />
        )}
      />
      {images.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {images.map((img, i) => (
            <View key={img.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { backgroundColor: colors.border, alignItems: "center", justifyContent: "center" },
  dots: { position: "absolute", bottom: 10, alignSelf: "center", flexDirection: "row", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { backgroundColor: "#fff" },
});
