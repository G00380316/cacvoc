import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';

import { useAppTheme } from '@/contexts/ThemeContext';

export default function BlurTabBarBackground() {
  const { scheme } = useAppTheme();

  return (
    <BlurView
      // Follow the app's selected theme rather than the system appearance,
      // while matching the native tab bar material on iOS.
      tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      intensity={100}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
