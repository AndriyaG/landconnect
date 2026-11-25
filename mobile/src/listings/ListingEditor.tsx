import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { errorMessage } from "@/api/client";
import { createListing, deleteListing, updateListing, uploadListingImage, type Listing, type LocalImage } from "@/api/listings";
import { queryClient } from "@/api/queryClient";
import { LocationPicker } from "@/components/LocationPicker";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { colors, Screen } from "@/theme";

import { ChipGroup } from "./ChipGroup";
import { FormField } from "./FormField";
import { ImagePickerField } from "./ImagePickerField";
import { AREA_UNITS, EMPTY_FORM, formFromListing, LAND_TYPES, STATUSES, toPayload, validate, type FormErrors, type ListingForm } from "./listingForm";

function refresh(id?: number) {
  queryClient.invalidateQueries({ queryKey: ["listings"] });
  queryClient.invalidateQueries({ queryKey: ["my-listings"] });
  if (id) queryClient.invalidateQueries({ queryKey: ["listing", id] });
}

export function ListingEditor({ listing }: { listing?: Listing }) {
  const [saved, setSaved] = useState(listing);
  const [form, setForm] = useState<ListingForm>(listing ? formFromListing(listing) : EMPTY_FORM);
  const [pending, setPending] = useState<LocalImage[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mapTouched, setMapTouched] = useState(false);

  const set = <K extends keyof ListingForm>(key: K) => (value: ListingForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const landTypes = LAND_TYPES.some((t) => t.value === form.land_type)
    ? LAND_TYPES
    : [...LAND_TYPES, { value: form.land_type, label: form.land_type }];

  const save = async () => {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setError("Please fix the highlighted fields.");
      return;
    }
    setError(null);
    setBusy(true);
    let current = saved;
    let listingSaved = false;
    try {
      current = current
        ? await updateListing(current.id, { ...toPayload(form), status: form.status })
        : await createListing(toPayload(form));
      listingSaved = true;
      setSaved(current);
      for (const image of pending) {
        current = await uploadListingImage(current.id, image);
        setSaved(current);
        setPending((p) => p.slice(1));
      }
      refresh(current.id);
      router.back();
    } catch (e) {
      refresh(current?.id);
      setError(listingSaved ? `Listing saved, but a photo failed to upload: ${errorMessage(e)}` : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!saved) return;
    setDeleting(true);
    try {
      await deleteListing(saved.id);
      queryClient.removeQueries({ queryKey: ["listing", saved.id] });
      refresh();
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setDeleting(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert("Delete listing?", "This removes the listing and its photos permanently.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: remove },
    ]);

  const deleteButton = saved && (
    <Pressable accessibilityRole="button" accessibilityLabel="Delete listing" hitSlop={12} disabled={deleting || busy} onPress={confirmDelete}>
      {deleting ? <ActivityIndicator color="#fff" /> : <Ionicons name="trash-outline" size={22} color="#fff" />}
    </Pressable>
  );

  return (
    <Screen title={saved ? "Edit listing" : "New listing"} back right={deleteButton}>
      <KeyboardAvoidingView style={styles.flex} behavior="height">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" scrollEnabled={!mapTouched}>
          <FormField label="Title" error={errors.title}>
            <TextField placeholder="e.g. Corner plot near Whitefield" value={form.title} onChangeText={set("title")} maxLength={200} />
          </FormField>
          <FormField label="Description" error={errors.description}>
            <TextField
              placeholder="Road access, water, documents…"
              value={form.description}
              onChangeText={set("description")}
              multiline
              maxLength={5000}
              style={styles.multiline}
            />
          </FormField>
          <FormField label="Price (₹)" error={errors.price}>
            <TextField placeholder="Price in rupees" value={form.price} onChangeText={set("price")} keyboardType="number-pad" />
          </FormField>
          <FormField label="Area" error={errors.area_value}>
            <TextField placeholder="Area" value={form.area_value} onChangeText={set("area_value")} keyboardType="decimal-pad" />
            <ChipGroup label="Area unit" options={AREA_UNITS} value={form.area_unit} onChange={set("area_unit")} />
          </FormField>
          <FormField label="Land type" error={errors.land_type}>
            <ChipGroup label="Land type" options={landTypes} value={form.land_type} onChange={set("land_type")} />
          </FormField>
          {saved && (
            <FormField label="Status">
              <ChipGroup label="Status" options={STATUSES} value={form.status} onChange={set("status")} />
            </FormField>
          )}
          <FormField label="Address" error={errors.address}>
            <TextField placeholder="Area, city" value={form.address} onChangeText={set("address")} maxLength={300} />
          </FormField>
          <FormField label="Location" error={errors.location}>
            <LocationPicker value={form.location} onChange={set("location")} onTouchActive={setMapTouched} />
          </FormField>
          <FormField label="Photos">
            <ImagePickerField uploaded={saved?.images ?? []} pending={pending} onChange={setPending} onError={setError} />
          </FormField>
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton label={saved ? "Save changes" : "Create listing"} busy={busy} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: 16, gap: 18, paddingBottom: 32 },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  error: { color: colors.danger, textAlign: "center" },
});
