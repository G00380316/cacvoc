import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import Entypo from "@expo/vector-icons/Entypo";
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useAuth } from '@/contexts/AuthContext';
import { usePalette } from '@/contexts/ThemeContext';

type EntypoName = React.ComponentProps<typeof Entypo>["name"];

function TabIcon({ name, focused }: { name: EntypoName; focused: boolean }) {
  const palette = usePalette();
  return (
    <Entypo
      size={focused ? 28 : 24}
      name={name}
      color={focused ? palette.accent : palette.muted}
    />
  );
}

const tabIcon = (name: EntypoName) =>
  function TabBarIcon({ focused }: { focused: boolean }) {
    return <TabIcon name={name} focused={focused} />;
  };

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
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen
        name="sundaySchool"
        options={{ title: "Sunday", tabBarIcon: tabIcon("book") }}
      />
      <Tabs.Screen
        name="wordArchives"
        options={{ title: "WFT", tabBarIcon: tabIcon("archive") }}
      />
      <Tabs.Screen
        name="sundayArchives"
        options={{ title: "SS", tabBarIcon: tabIcon("documents") }}
      />
      <Tabs.Screen name="hymns" options={{ title: "Hymns", tabBarIcon: tabIcon("music") }} />
      <Tabs.Screen
        name="editor"
        options={{
          title: "Editor",
          tabBarIcon: tabIcon("edit"),
          // Only signed-in admins get the Editor tab.
          href: admin ? undefined : null,
        }}
      />
    </Tabs>
  );
}
