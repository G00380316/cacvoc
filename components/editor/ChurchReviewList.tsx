import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Button, Card } from "@/components/ui/Form";
import { apiRequest } from "@/constants/Api";
import { formatChurchLocation, type Church } from "@/constants/ChurchTypes";
import type { AppPalette } from "@/constants/Design";
import { useAuth } from "@/contexts/AuthContext";
import { useThemedStyles } from "@/contexts/ThemeContext";

type ReviewChurch = Church & { createdAt?: string };

/** Developer-only queue of churches waiting for approval. */
export function ChurchReviewList({ refreshKey }: { refreshKey: number }) {
  const styles = useThemedStyles(createStyles);
  const { token } = useAuth();
  const [churches, setChurches] = useState<ReviewChurch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const json = await apiRequest<{ churches: ReviewChurch[] }>(
        "/dev/churches?status=pending",
        { adminToken: token }
      );
      setChurches(json.churches);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Couldn't load churches");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const review = async (church: ReviewChurch, decision: "approve" | "reject") => {
    setBusyId(church.id);

    try {
      await apiRequest(`/dev/churches/${church.id}/${decision}`, {
        method: "POST",
        adminToken: token,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setChurches((current) => current.filter((item) => item.id !== church.id));
    } catch (reviewError) {
      Alert.alert(
        "Couldn't update church",
        reviewError instanceof Error ? reviewError.message : "Please try again."
      );
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = (church: ReviewChurch) => {
    Alert.alert(`Reject ${church.name}?`, "The admin can edit and resubmit it.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reject", style: "destructive", onPress: () => review(church, "reject") },
    ]);
  };

  if (loading) {
    return <Text style={styles.muted}>Loading pending churches…</Text>;
  }

  if (error) {
    return (
      <Text selectable style={styles.error}>
        {error}
      </Text>
    );
  }

  if (churches.length === 0) {
    return <Text style={styles.muted}>No churches are waiting for approval.</Text>;
  }

  return (
    <View style={styles.list}>
      {churches.map((church) => (
        <Card key={church.id}>
          <View style={styles.copy}>
            <Text style={styles.name}>{church.name}</Text>
            <Text selectable style={styles.detail}>
              {formatChurchLocation(church)}
            </Text>
            <Text style={styles.meta}>
              {church.latitude != null && church.longitude != null
                ? `${church.latitude.toFixed(4)}, ${church.longitude.toFixed(4)}`
                : "No map position"}
              {church.submittedBy ? ` · by ${church.submittedBy.username}` : ""}
              {church.createdAt
                ? ` · ${new Date(church.createdAt).toLocaleDateString()}`
                : ""}
            </Text>
          </View>
          <View style={styles.actions}>
            <Button
              title="Reject"
              variant="danger"
              disabled={busyId !== null}
              onPress={() => confirmReject(church)}
              style={styles.action}
            />
            <Button
              title="Approve"
              loading={busyId === church.id}
              disabled={busyId !== null}
              onPress={() => review(church, "approve")}
              style={styles.action}
            />
          </View>
        </Card>
      ))}
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    list: {
      gap: 12,
    },
    copy: {
      gap: 4,
    },
    name: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "700",
    },
    detail: {
      color: palette.text,
      fontSize: 15,
      lineHeight: 21,
    },
    meta: {
      color: palette.muted,
      fontSize: 13,
    },
    actions: {
      flexDirection: "row",
      gap: 10,
    },
    action: {
      flex: 1,
    },
    muted: {
      color: palette.muted,
      fontSize: 16,
      lineHeight: 23,
    },
    error: {
      color: palette.danger,
      fontSize: 16,
      lineHeight: 23,
    },
  });
