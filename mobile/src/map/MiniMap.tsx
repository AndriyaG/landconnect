import { StyleSheet, View } from "react-native";

import { colors } from "@/theme";

import type { LatLng } from "./leafletHtml";
import { LeafletMap } from "./LeafletMap";

export function MiniMap({ point, height = 160 }: { point: LatLng; height?: number }) {
  return (
    <View style={[styles.root, { height }]} pointerEvents="none" accessible accessibilityLabel="Map showing the listing location">
      <LeafletMap options={{ mode: "view", center: point, zoom: 15, pin: point }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 10, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
});
