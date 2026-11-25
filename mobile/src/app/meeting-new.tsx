import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { errorMessage } from "@/api/client";
import { fetchConversations } from "@/api/chat";
import { createMeeting } from "@/api/meetings";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { RoleBadge } from "@/listings/RoleBadge";
import { StateView } from "@/listings/StateView";
import type { PublicUser } from "@/store/auth";
import { colors, Screen } from "@/theme";

function scheduledIso(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

export default function NewMeetingScreen() {
  const queryClient = useQueryClient();
  const conversations = useQuery({ queryKey: ["conversations"], queryFn: fetchConversations });
  const people = uniquePeople(conversations.data ?? []);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: number) => {
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  };

  const submit = async () => {
    const when = scheduledIso(date.trim(), time.trim());
    if (!title.trim() || !when) {
      setError("Enter a title, a date as YYYY-MM-DD, and a time as HH:MM.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await createMeeting(title.trim(), when, selected);
      await queryClient.invalidateQueries({ queryKey: ["meetings"] });
      router.back();
    } catch (e) {
      Alert.alert("Couldn't create meeting", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="New meeting" back>
      <KeyboardAvoidingView style={styles.flex} behavior="height">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField placeholder="Title" value={title} onChangeText={setTitle} />
          <TextField placeholder="Date YYYY-MM-DD" value={date} onChangeText={setDate} autoCapitalize="none" />
          <TextField placeholder="Time HH:MM" value={time} onChangeText={setTime} autoCapitalize="none" />
          <Text style={styles.section}>Invite from chats</Text>
          {conversations.isError ? (
            <StateView icon="cloud-offline-outline" title="Couldn't load chats" text={errorMessage(conversations.error)} action={{ label: "Try again", onPress: () => conversations.refetch() }} />
          ) : people.length === 0 ? (
            <Text style={styles.hint}>Message someone from a listing first, then invite them here.</Text>
          ) : (
            people.map((person) => {
              const on = selected.includes(person.id);
              return (
                <Pressable
                  key={person.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`Invite ${person.name}`}
                  onPress={() => toggle(person.id)}
                  style={styles.person}
                >
                  <View style={[styles.box, on && styles.boxOn]} />
                  <Text style={styles.name}>{person.name}</Text>
                  <RoleBadge role={person.role} />
                </Pressable>
              );
            })
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton label="Create meeting" onPress={submit} busy={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function uniquePeople(conversations: { other_user: PublicUser }[]) {
  const byId = new Map<number, PublicUser>();
  for (const conversation of conversations) byId.set(conversation.other_user.id, conversation.other_user);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 10 },
  section: { marginTop: 8, fontSize: 13, fontWeight: "700", color: colors.primary, textTransform: "uppercase" },
  hint: { color: colors.muted, fontSize: 14 },
  person: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 8, padding: 12 },
  box: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: colors.primary },
  boxOn: { backgroundColor: colors.primary },
  name: { flex: 1, fontSize: 16, color: colors.text, fontWeight: "600" },
  error: { color: colors.danger },
});
