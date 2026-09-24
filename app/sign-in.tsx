import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Button, TextField } from "@/components/ui/Form";
import type { AppPalette } from "@/constants/Design";
import { useAuth } from "@/contexts/AuthContext";
import { useThemedStyles } from "@/contexts/ThemeContext";

export default function SignInScreen() {
  const styles = useThemedStyles(createStyles);
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const shake = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const hasInput = username.trim().length > 0 && password.length > 0;

  const submit = async () => {
    if (!hasInput || submitting) {
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
      shake.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Sign in with the admin account you were given to manage your church&apos;s content.
        </Text>

        <Animated.View style={[styles.fields, shakeStyle]}>
          <TextField
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholder="Username"
          />
          <TextField
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            placeholder="Password"
          />
        </Animated.View>

        {error ? (
          <Animated.Text key={error} entering={FadeIn.duration(200)} selectable style={styles.error}>
            {error}
          </Animated.Text>
        ) : null}

        <Button
          title="Sign in"
          disabled={!hasInput}
          loading={submitting}
          onPress={submit}
          style={styles.submit}
        />
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
    fields: {
      gap: 18,
    },
    error: {
      color: palette.danger,
      fontSize: 15,
      lineHeight: 21,
    },
    submit: {
      marginTop: 6,
    },
  });
