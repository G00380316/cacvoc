import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, TextField } from "@/components/ui/Form";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { apiRequest } from "@/constants/Api";
import type { AppPalette } from "@/constants/Design";
import { toDayKey } from "@/constants/PostFormat";
import { POST_TYPES, type Post, type PostInput, type PostType } from "@/constants/PostTypes";
import { pickImage, uploadImage } from "@/constants/Uploads";
import { useAuth } from "@/contexts/AuthContext";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

const BODY_LABELS: Record<PostType, string> = {
  announcement: "Message",
  event: "Details",
  sermon: "Notes",
  devotional: "Devotional",
};

function isPostType(value: unknown): value is PostType {
  return POST_TYPES.some((option) => option.type === value);
}

function nextHour() {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

function parseDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default function PostEditorScreen() {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const { id, type: typeParam } = useLocalSearchParams<{ id?: string; type?: string }>();
  const { token } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loadError, setLoadError] = useState("");
  const [uploadsEnabled, setUploadsEnabled] = useState(false);

  useEffect(() => {
    apiRequest<{ uploadsEnabled: boolean }>("/editor/config", { adminToken: token })
      .then((json) => setUploadsEnabled(json.uploadsEnabled))
      .catch(() => setUploadsEnabled(false));
  }, [token]);

  useEffect(() => {
    if (!id) {
      return;
    }
    apiRequest<{ post: Post }>(`/posts/${id}`)
      .then((json) => setPost(json.post))
      .catch((error) =>
        setLoadError(error instanceof Error ? error.message : "Couldn't load this post.")
      );
  }, [id]);

  const type: PostType = post?.type ?? (isPostType(typeParam) ? typeParam : "announcement");
  const label = POST_TYPES.find((option) => option.type === type)?.label ?? "Post";

  return (
    <>
      <Stack.Screen
        options={{
          title: `${id ? "Edit" : "New"} ${label.toLowerCase()}`,
          headerLeft: () => (
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          ),
        }}
      />
      {id && !post ? (
        <View style={styles.centered}>
          {loadError ? (
            <Text selectable style={styles.error}>
              {loadError}
            </Text>
          ) : (
            <ActivityIndicator color={palette.accent} />
          )}
        </View>
      ) : (
        <PostForm type={type} initial={post} uploadsEnabled={uploadsEnabled} />
      )}
    </>
  );
}

function PostForm({
  type,
  initial,
  uploadsEnabled,
}: {
  type: PostType;
  initial: Post | null;
  uploadsEnabled: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [imageKey, setImageKey] = useState<string | null>(initial?.imageKey ?? null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [startsAt, setStartsAt] = useState(() =>
    initial?.startsAt ? new Date(initial.startsAt) : nextHour()
  );
  const [hasEnd, setHasEnd] = useState(Boolean(initial?.endsAt));
  const [endsAt, setEndsAt] = useState(() =>
    initial?.endsAt
      ? new Date(initial.endsAt)
      : new Date(startsAt.getTime() + 2 * 60 * 60 * 1000)
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [preacher, setPreacher] = useState(initial?.preacher ?? "");
  const [mediaUrl, setMediaUrl] = useState(initial?.mediaUrl ?? "");
  const [bibleRef, setBibleRef] = useState(initial?.bibleRef ?? "");
  const [day, setDay] = useState(() => (initial?.date ? parseDayKey(initial.date) : new Date()));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const problem = !title.trim()
    ? "Add a title."
    : type === "event" && hasEnd && endsAt < startsAt
      ? "The end time must be after the start."
      : type === "sermon" && mediaUrl.trim() && !/^https?:\/\//i.test(mediaUrl.trim())
        ? "The link must start with http:// or https://."
        : "";

  const chooseImage = async () => {
    if (!token) {
      return;
    }

    const previous = { key: imageKey, preview: imagePreview };
    let picked;

    try {
      picked = await pickImage();
    } catch {
      Alert.alert("Couldn't open your photos", "Please try again.");
      return;
    }

    if (!picked) {
      return;
    }

    setImagePreview(picked.uri);
    setUploading(true);

    try {
      setImageKey(await uploadImage(picked, token));
    } catch (uploadError) {
      setImageKey(previous.key);
      setImagePreview(previous.preview);
      Alert.alert(
        "Couldn't add the image",
        uploadError instanceof Error ? uploadError.message : "Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (problem) {
      setError(problem);
      return;
    }

    const input: PostInput = {
      type,
      title: title.trim(),
      body: body.trim(),
      imageKey,
      startsAt: type === "event" ? startsAt.toISOString() : null,
      endsAt: type === "event" && hasEnd ? endsAt.toISOString() : null,
      location: type === "event" ? location.trim() || null : null,
      preacher: type === "sermon" ? preacher.trim() || null : null,
      mediaUrl: type === "sermon" ? mediaUrl.trim() || null : null,
      bibleRef: type === "sermon" || type === "devotional" ? bibleRef.trim() || null : null,
      date: type === "devotional" ? toDayKey(day) : null,
    };

    setSaving(true);
    setError("");

    try {
      await apiRequest(initial ? `/editor/posts/${initial.id}` : "/editor/posts", {
        method: initial ? "PUT" : "POST",
        body: input,
        adminToken: token,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (saveError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(saveError instanceof Error ? saveError.message : "Couldn't save this post.");
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!initial) {
      return;
    }
    Alert.alert(`Delete “${initial.title}”?`, "Members will no longer see it.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await apiRequest(`/editor/posts/${initial.id}`, {
              method: "DELETE",
              adminToken: token,
            });
            router.back();
          } catch (deleteError) {
            setError(
              deleteError instanceof Error ? deleteError.message : "Couldn't delete this post."
            );
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder={
            type === "event" ? "Harvest Thanksgiving Service" : type === "sermon" ? "Walking by faith" : "Title"
          }
          maxLength={140}
          autoCapitalize="sentences"
        />

        {type === "event" ? (
          <Animated.View layout={LinearTransition.duration(220)} style={styles.group}>
            <View style={styles.inlineRow}>
              <Text style={styles.inlineLabel}>Starts</Text>
              <DateTimeField
                mode="datetime"
                value={startsAt}
                onChange={(date) => {
                  setStartsAt(date);
                  if (endsAt < date) {
                    setEndsAt(new Date(date.getTime() + 2 * 60 * 60 * 1000));
                  }
                }}
              />
            </View>
            <View style={styles.inlineRow}>
              <Text style={styles.inlineLabel}>Add an end time</Text>
              <Switch
                value={hasEnd}
                onValueChange={setHasEnd}
                trackColor={{ true: palette.accent }}
              />
            </View>
            {hasEnd ? (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                style={styles.inlineRow}
              >
                <Text style={styles.inlineLabel}>Ends</Text>
                <DateTimeField
                  mode="datetime"
                  value={endsAt}
                  minimumDate={startsAt}
                  onChange={setEndsAt}
                />
              </Animated.View>
            ) : null}
            <TextField
              label="Location"
              value={location}
              onChangeText={setLocation}
              placeholder="Church auditorium"
              maxLength={200}
            />
          </Animated.View>
        ) : null}

        {type === "sermon" ? (
          <View style={styles.group}>
            <TextField
              label="Preacher"
              value={preacher}
              onChangeText={setPreacher}
              placeholder="Pastor's name"
              autoCapitalize="words"
              maxLength={120}
            />
            <TextField
              label="Bible reference"
              value={bibleRef}
              onChangeText={setBibleRef}
              placeholder="Hebrews 11:1-6"
              maxLength={120}
            />
            <TextField
              label="Watch or listen link"
              value={mediaUrl}
              onChangeText={setMediaUrl}
              placeholder="https://youtube.com/…"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ) : null}

        {type === "devotional" ? (
          <View style={styles.group}>
            <View style={styles.inlineRow}>
              <Text style={styles.inlineLabel}>For</Text>
              <DateTimeField mode="date" value={day} onChange={setDay} />
            </View>
            <TextField
              label="Bible reference"
              value={bibleRef}
              onChangeText={setBibleRef}
              placeholder="Psalm 23:1"
              maxLength={120}
            />
          </View>
        ) : null}

        <TextField
          label={BODY_LABELS[type]}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={10000}
          style={styles.body}
          placeholder={type === "announcement" ? "What would you like members to know?" : undefined}
        />

        <View style={styles.group}>
          <Text style={styles.fieldLabel}>Image</Text>
          {imagePreview ? (
            <Animated.View entering={FadeIn.duration(250)} style={styles.imageFrame}>
              <Image
                source={{ uri: imagePreview }}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
              {uploading ? (
                <Animated.View
                  entering={FadeIn.duration(150)}
                  exiting={FadeOut.duration(200)}
                  style={styles.imageOverlay}
                >
                  <ActivityIndicator color="#ffffff" />
                  <Text style={styles.imageOverlayText}>Uploading…</Text>
                </Animated.View>
              ) : null}
            </Animated.View>
          ) : null}
          <View style={styles.imageActions}>
            <Button
              title={imagePreview ? "Change image" : "Add image"}
              variant="secondary"
              disabled={!uploadsEnabled || uploading}
              onPress={chooseImage}
              style={styles.imageAction}
            />
            {imagePreview ? (
              <Button
                title="Remove"
                variant="danger"
                disabled={uploading}
                onPress={() => {
                  setImageKey(null);
                  setImagePreview(null);
                }}
                style={styles.imageAction}
              />
            ) : null}
          </View>
          {!uploadsEnabled ? (
            <Text style={styles.hint}>Image uploads aren&apos;t set up on the server yet.</Text>
          ) : null}
        </View>

        {error ? (
          <Animated.Text key={error} entering={FadeIn.duration(200)} selectable style={styles.error}>
            {error}
          </Animated.Text>
        ) : null}

        <Button
          title={initial ? "Save changes" : "Publish"}
          loading={saving}
          disabled={uploading || deleting || Boolean(problem)}
          onPress={save}
        />
        {initial ? (
          <Button
            title="Delete"
            variant="danger"
            loading={deleting}
            disabled={saving}
            onPress={confirmDelete}
          />
        ) : null}
        {problem && (title || body) ? <Text style={styles.hint}>{problem}</Text> : null}
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
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.background,
      padding: 24,
    },
    content: {
      padding: 24,
      gap: 18,
    },
    cancel: {
      color: palette.accent,
      fontSize: 17,
    },
    group: {
      gap: 14,
    },
    inlineRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      minHeight: 44,
    },
    inlineLabel: {
      color: palette.text,
      fontSize: 16,
    },
    fieldLabel: {
      color: palette.text,
      fontSize: 14,
      fontWeight: "700",
    },
    body: {
      minHeight: 160,
      paddingTop: 13,
      textAlignVertical: "top",
    },
    imageFrame: {
      aspectRatio: 16 / 9,
      borderCurve: "continuous",
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: palette.surfaceSoft,
    },
    image: {
      flex: 1,
    },
    imageOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
    },
    imageOverlayText: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: "600",
    },
    imageActions: {
      flexDirection: "row",
      gap: 10,
    },
    imageAction: {
      flex: 1,
    },
    hint: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 20,
    },
    error: {
      color: palette.danger,
      fontSize: 15,
      lineHeight: 21,
    },
  });
