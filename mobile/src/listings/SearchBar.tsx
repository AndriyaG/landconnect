import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { colors } from "@/theme";

type Props = { value: string; onChange: (v: string) => void };

export function SearchBar({ value, onChange }: Props) {
  return (
    <View style={styles.bar}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="Search title, area or address"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Search listings"
        returnKeyType="search"
        autoCorrect={false}
      />
      {!!value && (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => onChange("")}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    marginTop: 10,
  },
  input: { flex: 1, paddingVertical: 10, fontSize: 15, color: colors.text },
});
