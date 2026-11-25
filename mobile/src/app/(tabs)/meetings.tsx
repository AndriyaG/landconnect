import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { errorMessage } from "@/api/client";
import { fetchMeetings, type Meeting } from "@/api/meetings";
import { useCallClient } from "@/calls/CallProvider";
import { joinMeetingCall } from "@/calls/media";
import type { StreamVideoClient } from "@stream-io/video-react-native-sdk";
import { StateView } from "@/listings/StateView";
import { useAuth } from "@/store/auth";
import { colors, Header } from "@/theme";

export default function MeetingsScreen() {
  const me = useAuth((s) => s.user);
  const { client } = useCallClient();
  const query = useQuery({ queryKey: ["meetings"], queryFn: fetchMeetings });

  return (
    <View style={styles.root}>
      <Header
        title="Meetings"
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="New meeting" hitSlop={8} onPress={() => router.push("/meeting-new")}>
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        }
      />
      {query.isPending ? (
        <ActivityIndicator style={styles.loading} size="large" color={colors.primary} accessibilityLabel="Loading meetings" />
      ) : query.isError ? (
        <StateView
          icon="cloud-offline-outline"
          title="Couldn't load meetings"
          text={errorMessage(query.error)}
          action={{ label: "Try again", onPress: () => query.refetch() }}
        />
      ) : (
        <FlatList
          data={query.data}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }} tintColor={colors.primary} />}
          contentContainerStyle={query.data.length === 0 ? styles.empty : styles.list}
          ListEmptyComponent={<StateView icon="videocam-outline" title="No meetings yet" text="Create one and invite people you already chat with." />}
          renderItem={({ item }) => <MeetingRow meeting={item} meId={me?.id} client={client} />}
        />
      )}
    </View>
  );
}

function MeetingRow({ meeting, meId, client }: { meeting: Meeting; meId?: number; client: StreamVideoClient | null }) {
  const [joining, setJoining] = useState(false);
  const when = new Date(meeting.scheduled_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const names = meeting.participants.filter((p) => p.id !== meId).map((p) => p.name);
  const join = async () => {
    if (!client) {
      Alert.alert("Join", "Still connecting to the call service. Try again in a moment.");
      return;
    }
    setJoining(true);
    try {
      await joinMeetingCall(client, meeting.id);
    } catch (e) {
      Alert.alert("Join", errorMessage(e));
    } finally {
      setJoining(false);
    }
  };
  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <Text style={styles.title}>{meeting.title}</Text>
        <Text style={styles.meta}>{when}</Text>
        <Text style={styles.meta} numberOfLines={2}>
          {meeting.host.id === meId ? "You are hosting" : `Host ${meeting.host.name}`}
          {names.length ? ` · ${names.join(", ")}` : ""}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Join ${meeting.title}`}
        accessibilityState={{ disabled: joining, busy: joining }}
        disabled={joining}
        onPress={join}
        style={({ pressed }) => [styles.join, pressed && { opacity: 0.7 }]}
      >
        {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinText}>Join</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loading: { marginTop: 48 },
  empty: { flexGrow: 1 },
  list: { padding: 12, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
  },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
  join: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  joinText: { color: "#fff", fontWeight: "700" },
});
