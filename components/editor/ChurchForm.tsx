import * as Haptics from "expo-haptics";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Button, TextField } from "@/components/ui/Form";
import type { Church } from "@/constants/ChurchTypes";
import type { AppPalette } from "@/constants/Design";
import {
  describeCoordinates,
  getCurrentCoordinates,
  type Coordinates,
} from "@/constants/Location";
import { useThemedStyles } from "@/contexts/ThemeContext";

export type ChurchFormValues = {
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
};

type ChurchFormProps = {
  initial?: Church | null;
  submitting: boolean;
  onSubmit: (values: ChurchFormValues) => void;
  onCancel?: () => void;
};

export function ChurchForm({ initial, submitting, onSubmit, onCancel }: ChurchFormProps) {
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [coords, setCoords] = useState<Coordinates | null>(
    initial?.latitude != null && initial?.longitude != null
      ? { latitude: initial.latitude, longitude: initial.longitude }
      : null
  );
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  const canSubmit =
    name.trim().length > 0 && city.trim().length > 0 && country.trim().length > 0;

  const useCurrentLocation = async () => {
    setLocating(true);
    setLocationMessage("");
    const result = await getCurrentCoordinates();

    if (result.status === "ok") {
      setCoords(result.coords);
      const place = await describeCoordinates(result.coords);
      if (place) {
        setAddress((current) => current || place.address);
        setCity((current) => current || place.city);
        setCountry((current) => current || place.country);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setLocationMessage(
        result.status === "denied"
          ? "Location permission was denied. You can still type the address."
          : "Couldn't get your location. You can still type the address."
      );
    }

    setLocating(false);
  };

  return (
    <View style={styles.form}>
      <TextField
        label="Church name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. CAC Oke-Ayo Assembly"
        autoCapitalize="words"
      />
      <TextField
        label="Street address"
        value={address}
        onChangeText={setAddress}
        placeholder="Optional"
        autoCapitalize="words"
      />
      <View style={styles.pair}>
        <View style={styles.pairItem}>
          <TextField label="City" value={city} onChangeText={setCity} autoCapitalize="words" />
        </View>
        <View style={styles.pairItem}>
          <TextField
            label="Country"
            value={country}
            onChangeText={setCountry}
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={styles.locationRow}>
        <Text style={styles.locationText}>
          {coords
            ? `Pinned at ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
            : "Add the church's position so nearby members can find it."}
        </Text>
        <Button
          title={coords ? "Update location" : "Use my current location"}
          variant="secondary"
          loading={locating}
          onPress={useCurrentLocation}
        />
        {locationMessage ? (
          <Animated.Text entering={FadeIn.duration(200)} style={styles.hint}>
            {locationMessage}
          </Animated.Text>
        ) : null}
      </View>

      <Button
        title="Submit for approval"
        disabled={!canSubmit}
        loading={submitting}
        onPress={() =>
          onSubmit({
            name: name.trim(),
            address: address.trim(),
            city: city.trim(),
            country: country.trim(),
            latitude: coords?.latitude ?? null,
            longitude: coords?.longitude ?? null,
          })
        }
      />
      {onCancel ? <Button title="Cancel" variant="secondary" onPress={onCancel} /> : null}
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    form: {
      gap: 16,
    },
    pair: {
      flexDirection: "row",
      gap: 12,
    },
    pairItem: {
      flex: 1,
    },
    locationRow: {
      gap: 10,
    },
    locationText: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 20,
    },
    hint: {
      color: palette.danger,
      fontSize: 14,
      lineHeight: 20,
    },
  });
