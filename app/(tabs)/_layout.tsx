import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import Entypo from "@expo/vector-icons/Entypo";
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: "absolute",
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <Entypo
              size={focused ? 40 : 30}
              name="dot-single"
              color={focused ? "green" : "red"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sundaySchool"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <Entypo
              size={focused ? 40 : 30}
              name="dot-single"
              color={focused ? "green" : "red"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
