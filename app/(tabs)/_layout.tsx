import { useIsFocused } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { HapticTab } from '@/components/HapticTab';
import Entypo from "@expo/vector-icons/Entypo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useAuth } from '@/contexts/AuthContext';
import { usePalette } from '@/contexts/ThemeContext';

type EntypoName = React.ComponentProps<typeof Entypo>["name"];
type CommunityName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
type Glyph = { family: "entypo"; name: EntypoName } | { family: "community"; name: CommunityName };

// The tab bar draws an active and an inactive copy of each icon and swaps between them,
// so `focused` only picks the colour; the tab's real focus drives a gentle size change.
function TabIcon({ glyph, focused }: { glyph: Glyph; focused: boolean }) {
  const palette = usePalette();
  const isTabFocused = useIsFocused();
  const grow = useSharedValue(isTabFocused ? 1 : 0);

  useEffect(() => {
    grow.value = withSpring(isTabFocused ? 1 : 0, { damping: 14, stiffness: 220 });
  }, [grow, isTabFocused]);

  const growStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.16 * grow.value }],
  }));

  return (
    <Animated.View style={growStyle}>
      {glyph.family === "entypo" ? (
        <Entypo size={24} name={glyph.name} color={focused ? palette.accent : palette.muted} />
      ) : (
        <MaterialCommunityIcons
          size={26}
          name={glyph.name}
          color={focused ? palette.accent : palette.muted}
        />
      )}
    </Animated.View>
  );
}

const tabIcon = (glyph: Glyph) =>
  function TabBarIcon({ focused }: { focused: boolean }) {
    return <TabIcon glyph={glyph} focused={focused} />;
  };
const entypoIcon = (name: EntypoName) => tabIcon({ family: "entypo", name });
const communityIcon = (name: CommunityName) => tabIcon({ family: "community", name });

export default function TabLayout() {
  const palette = usePalette();
  const { admin } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
        },
        headerShown: false,
        animation: "fade",
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: "absolute",
            borderTopColor: palette.border,
          },
          default: {
            backgroundColor: palette.surface,
            borderTopColor: palette.border,
          },
        }),
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: entypoIcon("home") }} />
      <Tabs.Screen
        name="sundaySchool"
        options={{ title: "Sunday", tabBarIcon: entypoIcon("book") }}
      />
      <Tabs.Screen
        name="church"
        options={{ title: "My Church", tabBarIcon: communityIcon("church") }}
      />
      <Tabs.Screen name="hymns" options={{ title: "Hymns", tabBarIcon: entypoIcon("music") }} />
      <Tabs.Screen
        name="editor"
        options={{
          title: "Editor",
          tabBarIcon: entypoIcon("edit"),
          // Only signed-in admins get the Editor tab.
          href: admin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarIcon: entypoIcon("cog") }}
      />
    </Tabs>
  );
}
