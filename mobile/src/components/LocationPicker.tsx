import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { INDIA, type LatLng } from "@/map/leafletHtml";
import { LeafletMap, type LeafletMapHandle, type MapMessage } from "@/map/LeafletMap";
import { colors } from "@/theme";

export type { LatLng };

type Props = {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  onTouchActive?: (active: boolean) => void;
  height?: number;
};

export function LocationPicker({ value, onChange, onTouchActive, height = 260 }: Props) {
  const mapRef = useRef<LeafletMapHandle>(null);
  const [initial] = useState(value);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onMessage = (msg: MapMessage) => {
    if (msg.type === "pick") {
      setMessage(null);
      onChange({ lat: msg.lat, lng: msg.lng });
    }
  };

  const locateMe = async () => {
    setMessage(null);
    setLocating(true);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setMessage("Location permission denied. Tap the map to place the marker instead.");
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        setMessage("Location is turned off. Enable it in your device settings.");
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { lat: coords.latitude, lng: coords.longitude };
      mapRef.current?.call("setPosition", next.lat, next.lng);
      onChange(next);
    } catch {
      setMessage("Couldn't get your location. Try again or tap the map.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.root}>
      <View
        style={[styles.map, { height }]}
        accessibilityLabel="Map. Tap to place the marker, drag the marker to adjust."
        onTouchStart={() => onTouchActive?.(true)}
        onTouchEnd={() => onTouchActive?.(false)}
        onTouchCancel={() => onTouchActive?.(false)}
      >
        <LeafletMap
          ref={mapRef}
          options={{ mode: "pick", center: initial ?? INDIA, zoom: initial ? 15 : 5, pin: initial }}
          onMessage={onMessage}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.coords}>
          {value ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : "Tap the map to place the marker"}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use current location"
          accessibilityState={{ busy: locating, disabled: locating }}
          disabled={locating}
          onPress={locateMe}
          style={styles.button}
        >
          {locating ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="locate" size={18} color={colors.primary} />}
          <Text style={styles.buttonText}>Current location</Text>
        </Pressable>
      </View>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  map: { borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  coords: { flex: 1, color: colors.muted, fontSize: 13 },
  button: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.primary, minHeight: 40 },
  buttonText: { color: colors.primary, fontWeight: "600" },
  message: { color: colors.danger, fontSize: 13 },
});
