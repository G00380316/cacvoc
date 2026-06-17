import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import * as Haptics from "expo-haptics";
import { requireOptionalNativeModule } from "expo-modules-core";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Palette } from "@/constants/Design";
import { extractAudioUrl } from "@/constants/Reader";

type AudioPlayer = {
  pause: () => void;
  play: () => void;
  playing: boolean;
  remove: () => void;
};

type AudioModule = {
  createAudioPlayer: (
    source: { uri: string },
    options?: { updateInterval?: number }
  ) => AudioPlayer;
  setAudioModeAsync: (mode: {
    interruptionMode?: "duckOthers" | "doNotMix" | "mixWithOthers";
    playsInSilentMode?: boolean;
  }) => Promise<void>;
};

type SpeechVoice = {
  identifier?: string;
  language?: string;
  quality?: string;
};

type SpeechModule = {
  getAvailableVoicesAsync: () => Promise<SpeechVoice[]>;
  speak: (
    text: string,
    options?: {
      language?: string;
      onDone?: () => void;
      onError?: () => void;
      onStopped?: () => void;
      pitch?: number;
      rate?: number;
      voice?: string;
    }
  ) => void;
  stop: () => Promise<void>;
};

type FloatingReaderButtonProps = {
  audio?: string | null;
  speechSegments: string[];
  activeSpeechIndex: number | null;
  onActiveSpeechIndexChange: (index: number | null) => void;
  bottomOffset: number;
  activityKey?: number;
};

export function FloatingReaderButton({
  audio,
  speechSegments,
  activeSpeechIndex,
  onActiveSpeechIndexChange,
  bottomOffset,
  activityKey,
}: FloatingReaderButtonProps) {
  const audioUrl = useMemo(() => extractAudioUrl(audio), [audio]);
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechRef = useRef<SpeechModule | null>(null);
  const speechIndexRef = useRef(0);
  const speechSegmentsRef = useRef<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [voice, setVoice] = useState<string | undefined>();

  const hasAudio = Boolean(audioUrl && audioAvailable);
  const isPlaying = hasAudio ? isAudioPlaying : isSpeaking;
  const modeLabel = hasAudio ? "Audio" : "Read";

  const scheduleFade = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }

    opacity.value = withTiming(1, { duration: 160 });
    idleTimer.current = setTimeout(() => {
      opacity.value = withTiming(isPlaying ? 0.78 : 0.42, { duration: 420 });
    }, 3000);
  }, [isPlaying, opacity]);

  useEffect(() => {
    scheduleFade();
    return () => {
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
    };
  }, [activityKey, isPlaying, scheduleFade]);

  useEffect(() => {
    speechSegmentsRef.current = speechSegments;
  }, [speechSegments]);

  useEffect(() => {
    let isCancelled = false;
    let audioModule: AudioModule | null = null;

    async function setupAudio() {
      if (!audioUrl || !requireOptionalNativeModule("ExpoAudio")) {
        setAudioAvailable(false);
        return;
      }

      try {
        audioModule = (await import("expo-audio")) as AudioModule;
      } catch {
        if (!isCancelled) {
          setAudioAvailable(false);
        }
        return;
      }

      if (isCancelled) {
        return;
      }

      audioModule
        .setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: "duckOthers",
        })
        .catch(console.warn);

      const player = audioModule.createAudioPlayer(
        { uri: audioUrl },
        { updateInterval: 350 }
      );
      audioPlayerRef.current = player;
      setAudioAvailable(true);

      audioPollRef.current = setInterval(() => {
        setIsAudioPlaying(player.playing);
      }, 350);
    }

    setupAudio();

    return () => {
      isCancelled = true;
      if (audioPollRef.current) {
        clearInterval(audioPollRef.current);
        audioPollRef.current = null;
      }
      audioPlayerRef.current?.pause();
      audioPlayerRef.current?.remove();
      audioPlayerRef.current = null;
      setIsAudioPlaying(false);
    };
  }, [audioUrl]);

  useEffect(() => {
    let isCancelled = false;
    let speechModule: SpeechModule | null = null;

    async function setupSpeech() {
      if (!requireOptionalNativeModule("ExpoSpeech")) {
        speechRef.current = null;
        setSpeechAvailable(false);
        return;
      }

      try {
        speechModule = (await import("expo-speech")) as SpeechModule;
      } catch {
        if (!isCancelled) {
          speechRef.current = null;
          setSpeechAvailable(false);
        }
        return;
      }

      if (isCancelled) {
        return;
      }

      speechRef.current = speechModule;
      setSpeechAvailable(true);

      speechModule
        .getAvailableVoicesAsync()
        .then((voices) => {
          const preferredVoice = voices.find(
            (availableVoice) =>
              availableVoice.language?.toLowerCase().startsWith("en-gb") &&
              availableVoice.quality === "Enhanced"
          );
          const fallbackVoice =
            preferredVoice ??
            voices.find((availableVoice) =>
              availableVoice.language?.toLowerCase().startsWith("en")
            );

          setVoice(fallbackVoice?.identifier);
        })
        .catch(() => undefined);
    }

    setupSpeech();

    return () => {
      isCancelled = true;
      speechModule?.stop().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    return () => {
      speechRef.current?.stop().catch(() => undefined);
      audioPlayerRef.current?.pause();
      onActiveSpeechIndexChange(null);
    };
  }, [onActiveSpeechIndexChange]);

  const speakAtIndex = useCallback(
    (index: number) => {
      const segment = speechSegmentsRef.current[index];

      if (!segment) {
        setIsSpeaking(false);
        speechIndexRef.current = 0;
        onActiveSpeechIndexChange(null);
        return;
      }

      speechIndexRef.current = index;
      onActiveSpeechIndexChange(index);
      speechRef.current?.speak(segment, {
        language: "en-GB",
        voice,
        pitch: 1.02,
        rate: 0.86,
        onDone: () => speakAtIndex(index + 1),
        onStopped: () => {
          setIsSpeaking(false);
          onActiveSpeechIndexChange(null);
        },
        onError: () => {
          setIsSpeaking(false);
          onActiveSpeechIndexChange(null);
        },
      });
    },
    [onActiveSpeechIndexChange, voice]
  );

  const startSpeech = useCallback(async () => {
    if (!speechRef.current) {
      return;
    }

    await speechRef.current.stop();
    setIsSpeaking(true);
    speakAtIndex(activeSpeechIndex ?? speechIndexRef.current);
  }, [activeSpeechIndex, speakAtIndex]);

  const stopSpeech = useCallback(async () => {
    await speechRef.current?.stop();
    setIsSpeaking(false);
    onActiveSpeechIndexChange(null);
  }, [onActiveSpeechIndexChange]);

  const toggle = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scheduleFade();
    scale.value = withSpring(0.94, { damping: 12 }, () => {
      scale.value = withSpring(1);
    });

    if (hasAudio) {
      await speechRef.current?.stop();
      setIsSpeaking(false);
      onActiveSpeechIndexChange(null);

      const player = audioPlayerRef.current;

      if (!player) {
        return;
      }

      if (isAudioPlaying) {
        player.pause();
        setIsAudioPlaying(false);
      } else {
        player.play();
        setIsAudioPlaying(true);
      }
      return;
    }

    if (!speechAvailable) {
      return;
    }

    if (isSpeaking) {
      await stopSpeech();
    } else {
      await startSpeech();
    }
  }, [
    hasAudio,
    isAudioPlaying,
    isSpeaking,
    onActiveSpeechIndexChange,
    scale,
    scheduleFade,
    startSpeech,
    speechAvailable,
    stopSpeech,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!hasAudio && (!speechAvailable || speechSegments.length === 0)) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[
        styles.container,
        {
          bottom: bottomOffset + insets.bottom + 16,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause reader" : "Play reader"}
        onPress={toggle}
        style={({ pressed }) => [styles.button, pressed ? styles.pressed : undefined]}
      >
        <Entypo
          name={isPlaying ? "controller-paus" : "controller-play"}
          size={26}
          color={Palette.surface}
        />
        <ThemedText style={styles.label}>{modeLabel}</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 18,
    zIndex: 20,
  },
  button: {
    alignItems: "center",
    backgroundColor: Palette.accent,
    borderCurve: "continuous",
    borderRadius: 24,
    boxShadow: "0 10px 24px rgba(29, 111, 66, 0.28)",
    flexDirection: "row",
    gap: 8,
    minHeight: 56,
    paddingHorizontal: 18,
  },
  pressed: {
    opacity: 0.84,
  },
  label: {
    color: Palette.surface,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
});
