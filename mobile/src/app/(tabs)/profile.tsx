import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchProfile, updateMe, type CallPrivacy } from "@/api/auth";
import { errorMessage } from "@/api/client";
import { fetchBlocks, unblockUser } from "@/api/chat";
import { fetchCallHistory, type CallHistoryItem } from "@/calls/api";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ChipGroup } from "@/listings/ChipGroup";
import { RoleBadge } from "@/listings/RoleBadge";
import { canList, useAuth, type PublicUser } from "@/store/auth";
import { colors, Screen } from "@/theme";

const CALL_FROM: { value: CallPrivacy; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "contacts", label: "People I've chatted with" },
];

export default function ProfileScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["me"], queryFn: fetchProfile });
  const blocks = useQuery({ queryKey: ["blocks"], queryFn: fetchBlocks });
  const history = useQuery({ queryKey: ["call-history"], queryFn: fetchCallHistory });
  const privacy = useMutation({
    mutationFn: (call_privacy: CallPrivacy) => updateMe({ call_privacy }),
    onSuccess: (me) => queryClient.setQueryData(["me"], me),
  });
  const unblock = useMutation({
    mutationFn: unblockUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocks"] }),
    onError: (e: unknown) => Alert.alert("Couldn't unblock", errorMessage(e)),
  });

  return (
    <Screen title="Profile">
      <ScrollView contentContainerStyle={styles.body}>
        {user && (
          <View style={styles.card}>
            <Text style={styles.name}>{user.name}</Text>
            <RoleBadge role={user.role} />
          </View>
        )}
        {canList(user) && <PrimaryButton label="My listings" onPress={() => router.push("/my-listings")} />}
        <Text style={styles.section}>Allow calls from</Text>
        {profile.isPending ? (
          <ActivityIndicator color={colors.primary} accessibilityLabel="Loading call settings" />
        ) : profile.isError ? (
          <Text style={styles.error}>{errorMessage(profile.error)}</Text>
        ) : (
          <ChipGroup
            label="Allow calls from"
            options={CALL_FROM}
            value={profile.data.call_privacy}
            onChange={(value) => {
              if (value !== profile.data.call_privacy && !privacy.isPending) privacy.mutate(value);
            }}
          />
        )}
        {privacy.isError && <Text style={styles.error}>{errorMessage(privacy.error)}</Text>}
        <Text style={styles.section}>Blocked</Text>
        {blocks.isPending ? (
          <ActivityIndicator color={colors.primary} accessibilityLabel="Loading blocked users" />
        ) : blocks.isError ? (
          <Text style={styles.error}>{errorMessage(blocks.error)}</Text>
        ) : blocks.data.length === 0 ? (
          <Text style={styles.muted}>No blocked users.</Text>
        ) : (
          blocks.data.map((person) => (
            <BlockedRow
              key={person.id}
              person={person}
              busy={unblock.isPending && unblock.variables === person.id}
              onUnblock={() => unblock.mutate(person.id)}
            />
          ))
        )}
        <Text style={styles.section}>Call history</Text>
        {history.isPending ? (
          <ActivityIndicator color={colors.primary} accessibilityLabel="Loading call history" />
        ) : history.isError ? (
          <Text style={styles.error}>{errorMessage(history.error)}</Text>
        ) : history.data.length === 0 ? (
          <Text style={styles.muted}>No calls yet.</Text>
        ) : (
          history.data.map((item) => <HistoryRow key={item.id} item={item} />)
        )}
        <PrimaryButton label="Log out" color={colors.danger} onPress={logout} />
      </ScrollView>
    </Screen>
  );
}

function BlockedRow({ person, busy, onUnblock }: { person: PublicUser; busy: boolean; onUnblock: () => void }) {
  return (
    <View style={styles.blockRow}>
      <View style={styles.person}>
        <Text style={styles.rowTitle}>{person.name}</Text>
        <RoleBadge role={person.role} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Unblock ${person.name}`}
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={onUnblock}
        style={styles.unblock}
      >
        <Text style={styles.unblockText}>{busy ? "…" : "Unblock"}</Text>
      </Pressable>
    </View>
  );
}

function HistoryRow({ item }: { item: CallHistoryItem }) {
  const when = new Date(item.started_at).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <View style={styles.historyRow}>
      <Text style={styles.rowTitle}>{item.other_user.name}</Text>
      <Text style={styles.muted}>
        {item.direction === "outgoing" ? "Outgoing" : "Incoming"} {item.type} · {item.status}
      </Text>
      <Text style={styles.muted}>{when}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8, alignItems: "flex-start" },
  name: { color: colors.text, fontSize: 20, fontWeight: "700" },
  muted: { color: colors.muted },
  section: { color: colors.text, fontSize: 16, fontWeight: "700" },
  error: { color: colors.danger },
  blockRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  historyRow: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 2 },
  person: { flex: 1, gap: 4, alignItems: "flex-start" },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  unblock: { minHeight: 40, justifyContent: "center", paddingHorizontal: 8 },
  unblockText: { color: colors.primary, fontWeight: "700" },
});
