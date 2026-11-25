import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { colors } from "@/theme";

import { PRICE_FILTERS } from "./priceFilters";

type Props = { value: string; onChange: (id: string) => void };

const HIT_SLOP = { top: 4, bottom: 4 };

export function PriceFilterBar({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {PRICE_FILTERS.map((f) => {
        const active = f.id === value;
        return (
          <Pressable
            key={f.id}
            accessibilityRole="button"
            accessibilityLabel={`Price filter: ${f.label}`}
            accessibilityState={{ selected: active }}
            hitSlop={HIT_SLOP}
            onPress={() => onChange(f.id)}
            style={[styles.chip, active ? styles.active : styles.inactive]}
          >
            <Text style={[styles.text, active && styles.activeText]}>{f.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: "center" },
  chip: { minHeight: 40, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, justifyContent: "center" },
  inactive: { backgroundColor: colors.surface, borderColor: colors.border },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { fontSize: 14, lineHeight: 20, color: colors.text, fontWeight: "500" },
  activeText: { color: "#fff" },
});
