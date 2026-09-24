import { StyleSheet, Text } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { formatChurchLocation, type Church } from "@/constants/ChurchTypes";
import type { AppPalette } from "@/constants/Design";
import { useThemedStyles } from "@/contexts/ThemeContext";

type ChurchHeaderProps = {
  church: Pick<Church, "name" | "address" | "city" | "country">;
};

/** The chosen church's name and address at the top of the My Church tab. */
export function ChurchHeader({ church }: ChurchHeaderProps) {
  const styles = useThemedStyles(createStyles);
  const location = formatChurchLocation(church);

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.header}>
      <Text accessibilityRole="header" style={styles.name}>
        {church.name}
      </Text>
      {location ? (
        <Text selectable style={styles.location}>
          {location}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    header: {
      gap: 4,
    },
    name: {
      color: palette.text,
      fontSize: 24,
      fontWeight: "800",
      lineHeight: 30,
    },
    location: {
      color: palette.muted,
      fontSize: 15,
      lineHeight: 21,
    },
  });
