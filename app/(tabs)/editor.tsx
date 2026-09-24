import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChurchForm, type ChurchFormValues } from "@/components/editor/ChurchForm";
import { ChurchReviewList } from "@/components/editor/ChurchReviewList";
import { PostManager } from "@/components/editor/PostManager";
import { ServiceTimesEditor } from "@/components/editor/ServiceTimesEditor";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button, Card } from "@/components/ui/Form";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";
import { apiRequest } from "@/constants/Api";
import { formatChurchLocation, type Church, type ChurchStatus } from "@/constants/ChurchTypes";
import type { AppPalette } from "@/constants/Design";
import { useAuth } from "@/contexts/AuthContext";
import { usePalette, useThemedStyles } from "@/contexts/ThemeContext";

const STATUS_COPY: Record<ChurchStatus, { label: string; body: string }> = {
  pending: {
    label: "Waiting for approval",
    body: "The developer will confirm your church soon. You can still edit the details.",
  },
  approved: {
    label: "Approved",
    body: "Your church is confirmed. Members who choose it will see your content.",
  },
  rejected: {
    label: "Not approved",
    body: "Check the details are correct and submit again.",
  },
};

export default function EditorScreen() {
  const styles = useThemedStyles(createStyles);
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const bottom = useBottomTabOverflow();
  const { admin, token, refresh, setAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const submitChurch = async (values: ChurchFormValues) => {
    if (!admin) {
      return;
    }

    setSubmitting(true);

    try {
      const json = await apiRequest<{ church: Church }>("/editor/church", {
        method: "POST",
        body: values,
        adminToken: token,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAdmin({ ...admin, church: json.church });
      setEditing(false);
    } catch (submitError) {
      Alert.alert(
        "Couldn't submit church",
        submitError instanceof Error ? submitError.message : "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!admin) {
    return (
      <View style={[styles.screen, styles.signedOut, { paddingTop: insets.top + 10 }]}>
        <ScreenHeader title="Editor" />
        <View style={styles.body}>
          <Text style={styles.muted}>Sign in as an admin to manage your church.</Text>
          <Button title="Admin sign in" onPress={() => router.push("/sign-in")} />
        </View>
      </View>
    );
  }

  const church = admin.church;
  const status = church?.status ?? "pending";
  const showForm = !church || editing;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: bottom + 32 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
      }
    >
      <ScreenHeader title="Editor" />

      <View style={styles.body}>
        <Animated.View layout={LinearTransition.duration(220)} style={styles.section}>
          <Text style={styles.sectionTitle}>Your church</Text>

          {/* Keyed so switching between the form and the status card fades rather than snaps. */}
          <Animated.View key={showForm ? "form" : "status"} entering={FadeIn.duration(250)}>
            {showForm ? (
              <Card>
                {!church ? (
                  <Text style={styles.muted}>
                    Register the CAC church you manage. Once it&apos;s approved you can start
                    editing its content.
                  </Text>
                ) : null}
                <ChurchForm
                  initial={church}
                  submitting={submitting}
                  onSubmit={submitChurch}
                  onCancel={church ? () => setEditing(false) : undefined}
                />
              </Card>
            ) : (
              <Card>
                <View style={[styles.badge, styles[`badge_${status}`]]}>
                  <Text style={[styles.badgeText, styles[`badgeText_${status}`]]}>
                    {STATUS_COPY[status].label}
                  </Text>
                </View>
                <Text style={styles.churchName}>{church.name}</Text>
                <Text selectable style={styles.detail}>
                  {formatChurchLocation(church)}
                </Text>
                <Text style={styles.muted}>{STATUS_COPY[status].body}</Text>
                {status !== "approved" ? (
                  <Button
                    title={status === "rejected" ? "Edit and resubmit" : "Edit details"}
                    variant="secondary"
                    onPress={() => setEditing(true)}
                  />
                ) : null}
              </Card>
            )}
          </Animated.View>
        </Animated.View>

        {church?.status === "approved" ? (
          <>
            <Animated.View
              entering={FadeIn.duration(250)}
              layout={LinearTransition.duration(220)}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>Service times</Text>
              <ServiceTimesEditor />
            </Animated.View>
            <Animated.View
              entering={FadeIn.duration(250)}
              layout={LinearTransition.duration(220)}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>Posts</Text>
              <PostManager />
            </Animated.View>
          </>
        ) : null}

        {admin.role === "developer" ? (
          <Animated.View layout={LinearTransition.duration(220)} style={styles.section}>
            <Text style={styles.sectionTitle}>Pending churches</Text>
            <ChurchReviewList refreshKey={refreshKey} />
          </Animated.View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    signedOut: {
      gap: 8,
    },
    body: {
      paddingHorizontal: 24,
      gap: 28,
    },
    section: {
      gap: 10,
    },
    sectionTitle: {
      color: palette.muted,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    churchName: {
      color: palette.text,
      fontSize: 21,
      fontWeight: "800",
    },
    detail: {
      color: palette.text,
      fontSize: 16,
      lineHeight: 22,
    },
    muted: {
      color: palette.muted,
      fontSize: 16,
      lineHeight: 23,
    },
    badge: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badge_pending: {
      backgroundColor: palette.surfaceSoft,
    },
    badge_approved: {
      backgroundColor: palette.accentSoft,
    },
    badge_rejected: {
      backgroundColor: palette.surfaceSoft,
    },
    badgeText: {
      fontSize: 13,
      fontWeight: "700",
    },
    badgeText_pending: {
      color: palette.muted,
    },
    badgeText_approved: {
      color: palette.accent,
    },
    badgeText_rejected: {
      color: palette.danger,
    },
  });
