import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { AppPalette } from "@/constants/Design";
import { useAuth } from "@/contexts/AuthContext";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

export default function SignInScreen() {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await signIn(username, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
      router.navigate("/editor");
    } catch (signInError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(signInError instanceof Error ? signInError.message : "Sign in failed");
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          Sign in with the admin account you were given to manage your church&apos;s content.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholder="Username"
            placeholderTextColor={palette.muted}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            ref={passwordRef}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            placeholder="Password"
            placeholderTextColor={palette.muted}
            style={styles.input}
          />
        </View>

        {error ? (
          <Text selectable style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={submit}
          style={({ pressed }) => [
            styles.button,
            !canSubmit ? styles.buttonDisabled : undefined,
            pressed ? styles.buttonPressed : undefined,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={palette.onAccent} />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      padding: 24,
      gap: 18,
    },
    cancel: {
      color: palette.accent,
      fontSize: 17,
    },
    intro: {
      color: palette.muted,
      fontSize: 16,
      lineHeight: 23,
    },
    field: {
      gap: 6,
    },
    label: {
      color: palette.text,
      fontSize: 14,
      fontWeight: "700",
    },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderCurve: "continuous",
      borderRadius: 10,
      borderWidth: 1,
      color: palette.text,
      fontSize: 17,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    error: {
      color: palette.danger,
      fontSize: 15,
      lineHeight: 21,
    },
    button: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderCurve: "continuous",
      borderRadius: 12,
      justifyContent: "center",
      minHeight: 52,
      marginTop: 6,
    },
    buttonDisabled: {
      opacity: 0.45,
    },
    buttonPressed: {
      opacity: 0.75,
    },
    buttonText: {
      color: palette.onAccent,
      fontSize: 17,
      fontWeight: "700",
    },
  });
