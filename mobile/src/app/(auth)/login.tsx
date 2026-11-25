import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text } from "react-native";

import { login } from "@/api/auth";
import { authStyles as styles } from "@/components/authStyles";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { useSubmit } from "@/components/useSubmit";
import { useAuth } from "@/store/auth";
import { Header } from "@/theme";

export default function LoginScreen() {
  const setSession = useAuth((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, submit } = useSubmit(async () => setSession(await login(email.trim(), password)));

  return (
    <KeyboardAvoidingView style={styles.root} behavior="height">
      <Header title="LandConnect" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Sign in</Text>
        <TextField
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <TextField placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
        {error && <Text style={styles.error}>{error}</Text>}
        <PrimaryButton label="Login" busy={busy} onPress={submit} />
        <Pressable accessibilityRole="link" accessibilityLabel="Create an account" onPress={() => router.push("/register")}>
          <Text style={styles.link}>New here? Create an account</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
