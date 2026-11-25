import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text } from "react-native";

import { register } from "@/api/auth";
import { authStyles as styles } from "@/components/authStyles";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RolePicker } from "@/components/RolePicker";
import { TextField } from "@/components/TextField";
import { useSubmit } from "@/components/useSubmit";
import { useAuth, type Role } from "@/store/auth";
import { Header } from "@/theme";

export default function RegisterScreen() {
  const setSession = useAuth((s) => s.setSession);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("buyer");
  const { busy, error, submit } = useSubmit(async () =>
    setSession(await register(name.trim(), email.trim(), password, role)),
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior="height">
      <Header title="Create account" back />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>I am a…</Text>
        <RolePicker value={role} onChange={setRole} />
        <TextField placeholder="Name" value={name} onChangeText={setName} autoComplete="name" />
        <TextField
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <TextField
          placeholder="Password (min 8 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <PrimaryButton label="Register" busy={busy} onPress={submit} />
        <Pressable accessibilityRole="link" accessibilityLabel="Back to sign in" onPress={() => router.back()}>
          <Text style={styles.link}>Have an account? Sign in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
