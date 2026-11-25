import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { imageUrl, type Listing, type LocalImage } from "@/api/listings";
import { colors } from "@/theme";

import { MAX_IMAGES } from "./listingForm";

type Props = {
  uploaded: Listing["images"];
  pending: LocalImage[];
  onChange: (pending: LocalImage[]) => void;
  onError: (message: string) => void;
};

export function ImagePickerField({ uploaded, pending, onChange, onError }: Props) {
  const remaining = MAX_IMAGES - uploaded.length - pending.length;

  const pick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.7,
      });
      if (result.canceled) return;
      const picked = result.assets.slice(0, remaining).map((a) => ({ uri: a.uri, mimeType: a.mimeType, fileName: a.fileName }));
      onChange([...pending, ...picked]);
    } catch {
      onError("Couldn't open the photo library");
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {uploaded.map((img) => (
          <Image key={img.id} source={imageUrl(img.url)} style={styles.thumb} contentFit="cover" accessibilityLabel="Uploaded photo" />
        ))}
        {pending.map((img, i) => (
          <View key={img.uri}>
            <Image source={img.uri} style={[styles.thumb, styles.pending]} contentFit="cover" accessibilityLabel="Photo to upload" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              hitSlop={8}
              style={styles.remove}
              onPress={() => onChange(pending.filter((_, j) => j !== i))}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </Pressable>
          </View>
        ))}
        {remaining > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Add photos" onPress={pick} style={[styles.thumb, styles.add]}>
            <Ionicons name="camera-outline" size={28} color={colors.primary} />
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        )}
      </ScrollView>
      <Text style={styles.hint}>
        {uploaded.length + pending.length}/{MAX_IMAGES} photos{pending.length ? ` · ${pending.length} will upload on save` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  row: { gap: 8 },
  thumb: { width: 96, height: 96, borderRadius: 10, backgroundColor: colors.border },
  pending: { opacity: 0.85 },
  remove: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, padding: 3 },
  add: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: colors.primary, backgroundColor: colors.surface },
  addText: { color: colors.primary, fontWeight: "600", fontSize: 12 },
  hint: { color: colors.muted, fontSize: 13 },
});
