import { useCallback, useEffect, useRef } from "react";
import { useSharedValue, withTiming } from "react-native-reanimated";

/**
 * Opacity that returns to full whenever `activityKey` changes (or `wake` is called)
 * and fades to `idleOpacity` after a few quiet seconds.
 */
export function useIdleFade(activityKey: unknown, idleOpacity: number) {
  const opacity = useSharedValue(1);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wake = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }

    opacity.value = withTiming(1, { duration: 160 });
    idleTimer.current = setTimeout(() => {
      opacity.value = withTiming(idleOpacity, { duration: 420 });
    }, 3000);
  }, [idleOpacity, opacity]);

  useEffect(() => {
    wake();
    return () => {
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
    };
  }, [activityKey, wake]);

  return { opacity, wake };
}
