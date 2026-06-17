import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import Entypo from "@expo/vector-icons/Entypo";
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { Palette } from '@/constants/Design';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? "light"].tabIconDefault,
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
            borderTopColor: Palette.border,
          },
          default: {
            backgroundColor: Palette.surface,
            borderTopColor: Palette.border,
          },
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ focused }) => (
            <Entypo
              size={focused ? 28 : 24}
              name="home"
              color={focused ? Palette.accent : Palette.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sundaySchool"
        options={{
          title: "Sunday",
          tabBarIcon: ({ focused }) => (
            <Entypo
              size={focused ? 28 : 24}
              name="book"
              color={focused ? Palette.accent : Palette.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wordArchives"
        options={{
          title: "WFT",
          tabBarIcon: ({ focused }) => (
            <Entypo
              size={focused ? 28 : 24}
              name="archive"
              color={focused ? Palette.accent : Palette.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sundayArchives"
        options={{
          title: "SS",
          tabBarIcon: ({ focused }) => (
            <Entypo
              size={focused ? 28 : 24}
              name="documents"
              color={focused ? Palette.accent : Palette.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
