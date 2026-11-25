import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";

import { CallProvider } from "@/calls/CallProvider";
import { colors } from "@/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IconName; iconFocused: IconName }[] = [
  { name: "community", title: "Community", icon: "people-outline", iconFocused: "people" },
  { name: "map", title: "Map", icon: "map-outline", iconFocused: "map" },
  { name: "chats", title: "Chats", icon: "chatbubbles-outline", iconFocused: "chatbubbles" },
  { name: "meetings", title: "Meetings", icon: "videocam-outline", iconFocused: "videocam" },
  { name: "profile", title: "Profile", icon: "person-circle-outline", iconFocused: "person-circle" },
];

export default function TabsLayout() {
  return (
    <CallProvider>
      <Tabs
        backBehavior="firstRoute"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarLabelStyle: { fontWeight: "600" },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        {TABS.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.title,
              tabBarAccessibilityLabel: `${t.title} tab`,
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons name={focused ? t.iconFocused : t.icon} size={size} color={color as string} />
              ),
            }}
          />
        ))}
      </Tabs>
    </CallProvider>
  );
}
