import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { colors } from "@/theme";

export function ListingSkeleton({ count = 3 }: { count?: number }) {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View accessibilityLabel="Loading listings" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <Animated.View key={i} style={[styles.card, { opacity }]}>
          <View style={styles.image} />
          <View style={styles.body}>
            <View style={[styles.line, { width: "40%", height: 18 }]} />
            <View style={[styles.line, { width: "80%" }]} />
            <View style={[styles.line, { width: "60%" }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 12, marginBottom: 12, overflow: "hidden" },
  image: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.border },
  body: { padding: 12, gap: 8 },
  line: { height: 12, borderRadius: 6, backgroundColor: colors.border },
});
