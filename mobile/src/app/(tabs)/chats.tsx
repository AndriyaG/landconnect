import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { errorMessage } from "@/api/client";
import { fetchConversations, type Conversation } from "@/api/chat";
import { formatChatTime } from "@/chat/time";
import { RoleBadge } from "@/listings/RoleBadge";
import { StateView } from "@/listings/StateView";
import { colors, Screen } from "@/theme";

export default function ChatsScreen() {
  const query = useQuery({ queryKey: ["conversations"], queryFn: fetchConversations });

  return (
    <Screen title="Chats">
      {query.isPending ? (
        <ActivityIndicator style={styles.loading} size="large" color={colors.primary} accessibilityLabel="Loading chats" />
      ) : query.isError ? (
        <StateView
          icon="cloud-offline-outline"
          title="Couldn't load chats"
          text={errorMessage(query.error)}
          action={{ label: "Try again", onPress: () => query.refetch() }}
        />
      ) : (
        <FlatList
          data={query.data}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }} tintColor={colors.primary} />}
          contentContainerStyle={query.data.length === 0 ? styles.empty : undefined}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<StateView icon="chatbubbles-outline" title="No chats yet" text="Message a listing owner to start a conversation." />}
          renderItem={({ item }) => <ChatRow item={item} />}
        />
      )}
    </Screen>
  );
}

function ChatRow({ item }: { item: Conversation }) {
  const time = item.last_message ? formatChatTime(item.last_message.created_at) : "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${item.other_user.name}`}
      onPress={() => router.push({ pathname: "/chat/[id]", params: { id: String(item.id) } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.background }]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.other_user.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>{item.other_user.name}</Text>
          <RoleBadge role={item.other_user.role} />
          {!!time && <Text style={styles.time}>{time}</Text>}
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {item.last_message?.text ?? "No messages yet"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 48 },
  empty: { flexGrow: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 76 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  body: { flex: 1, gap: 2 },
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flexShrink: 1, fontSize: 16, fontWeight: "700", color: colors.text },
  time: { marginLeft: "auto", fontSize: 12, color: colors.muted },
  preview: { fontSize: 14, color: colors.muted },
});
