import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/store/auth";
import { colors } from "@/theme";

export default function Index() {
  const token = useAuth((s) => s.token);
  const hydrated = useAuth((s) => s.hydrated);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading" />
      </View>
    );
  }

  return <Redirect href={token ? "/community" : "/login"} />;
}
