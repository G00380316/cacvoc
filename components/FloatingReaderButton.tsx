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

import { Palette } from "@/constants/Design";
import { extractAudioUrl, prepareTextForSpeech } from "@/constants/Reader";

type AudioPlayer = {
  currentTime: number;
  duration: number;
  pause: () => void;
  play: () => void;
  playing: boolean;
  remove: () => void;
  seekTo?: (seconds: number) => Promise<void>;
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
  name?: string;
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

type ActiveReader = {
  id: symbol;
  stop: () => Promise<void> | void;
};

let activeReader: ActiveReader | null = null;

async function stopOtherReaders(id: symbol) {
  if (activeReader && activeReader.id !== id) {
    const stop = activeReader.stop;
    activeReader = null;
    await stop();
  }
}

function markActiveReader(id: symbol, stop: ActiveReader["stop"]) {
  activeReader = { id, stop };
}

function clearActiveReader(id: symbol) {
  if (activeReader?.id === id) {
    activeReader = null;
  }
}

const PREFERRED_MALE_VOICE_NAMES = [
  "daniel",
  "arthur",
  "oliver",
  "george",
  "jamie",
  "thomas",
  "fred",
  "eddy",
  "reed",
  "sandy",
  "aaron",
  "nathan",
];

function scoreVoice(voice: SpeechVoice) {
  const language = voice.language?.toLowerCase() ?? "";
  const label = `${voice.name ?? ""} ${voice.identifier ?? ""}`.toLowerCase();
  const isEnglish = language.startsWith("en");
  const isBritish = language.startsWith("en-gb");
  const isEnhanced = voice.quality === "Enhanced";
  const maleNameIndex = PREFERRED_MALE_VOICE_NAMES.findIndex((name) =>
    label.includes(name)
  );
  const maleVoiceScore =
    maleNameIndex >= 0 ? 100 - maleNameIndex * 2 : 0;

  return (
    (isEnglish ? 30 : 0) +
    (isBritish ? 24 : 0) +
    (isEnhanced ? 18 : 0) +
    maleVoiceScore
  );
}

function selectNarratorVoice(voices: SpeechVoice[]) {
  return [...voices]
    .filter((voice) => voice.language?.toLowerCase().startsWith("en"))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
}

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
  const fillProgress = useSharedValue(1);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readerIdRef = useRef(Symbol("floating-reader"));
  const speechRef = useRef<SpeechModule | null>(null);
  const speechIndexRef = useRef(0);
  const speechRunRef = useRef(0);
  const speechSegmentsRef = useRef<string[]>([]);
  const lastTapRef = useRef(0);
  const toggleLockRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [voice, setVoice] = useState<string | undefined>();

  const hasAudio = Boolean(audioUrl && audioAvailable);
  const isPlaying = hasAudio ? isAudioPlaying : isSpeaking;

  const scheduleFade = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }

    opacity.value = withTiming(1, { duration: 160 });
    idleTimer.current = setTimeout(() => {
      opacity.value = withTiming(isPlaying ? 0.62 : 0.34, { duration: 420 });
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
    const speechProgress =
      typeof activeSpeechIndex === "number" && speechSegments.length > 0
        ? Math.min(1, (activeSpeechIndex + 1) / speechSegments.length)
        : 0;
    const audioFill = isAudioPlaying
      ? audioProgress
      : audioProgress > 0 && audioProgress < 1
        ? audioProgress
        : 1;
    const nextFill = hasAudio ? audioFill : isSpeaking ? speechProgress : 1;

    fillProgress.value = withTiming(nextFill, { duration: isPlaying ? 420 : 300 });
  }, [
    activeSpeechIndex,
    audioProgress,
    fillProgress,
    hasAudio,
    isAudioPlaying,
    isPlaying,
    isSpeaking,
    speechSegments.length,
  ]);

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

      audioPlayerRef.current?.pause();
      audioPlayerRef.current?.remove();
      audioPlayerRef.current = null;

      const player = audioModule.createAudioPlayer(
        { uri: audioUrl },
        { updateInterval: 350 }
      );
      audioPlayerRef.current = player;
      setAudioAvailable(true);

      audioPollRef.current = setInterval(() => {
        const duration = player.duration || 0;
        const currentTime = player.currentTime || 0;
        const progress =
          duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

        setIsAudioPlaying(player.playing);
        setAudioProgress(progress >= 0.995 ? 1 : player.playing || progress > 0 ? progress : 0);

        if (!player.playing && progress >= 0.995) {
          clearActiveReader(readerIdRef.current);
        }
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
      setAudioProgress(0);
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
          setVoice(selectNarratorVoice(voices)?.identifier);
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
    const readerId = readerIdRef.current;

    return () => {
      speechRunRef.current += 1;
      speechRef.current?.stop().catch(() => undefined);
      audioPlayerRef.current?.pause();
      clearActiveReader(readerId);
      onActiveSpeechIndexChange(null);
    };
  }, [onActiveSpeechIndexChange]);

  const stopReader = useCallback(
    async (reset = false) => {
      speechRunRef.current += 1;
      await speechRef.current?.stop();
      audioPlayerRef.current?.pause();

      if (reset) {
        await audioPlayerRef.current?.seekTo?.(0);
        speechIndexRef.current = 0;
        setAudioProgress(0);
      }

      setIsSpeaking(false);
      setIsAudioPlaying(false);
      clearActiveReader(readerIdRef.current);
      onActiveSpeechIndexChange(null);
    },
    [onActiveSpeechIndexChange]
  );

  const speakAtIndex = useCallback(
    (index: number, runId: number) => {
      if (runId !== speechRunRef.current) {
        return;
      }

      const segment = speechSegmentsRef.current[index];

      if (!segment) {
        setIsSpeaking(false);
        speechIndexRef.current = 0;
        onActiveSpeechIndexChange(null);
        return;
      }

      speechIndexRef.current = index;
      onActiveSpeechIndexChange(index);
      speechRef.current?.speak(prepareTextForSpeech(segment), {
        language: "en-GB",
        voice,
        pitch: 0.96,
        rate: 0.68,
        onDone: () => {
          if (runId === speechRunRef.current) {
            speakAtIndex(index + 1, runId);
          }
        },
        onStopped: () => {
          if (runId === speechRunRef.current) {
            setIsSpeaking(false);
            onActiveSpeechIndexChange(null);
          }
        },
        onError: () => {
          if (runId === speechRunRef.current) {
            setIsSpeaking(false);
            onActiveSpeechIndexChange(null);
          }
        },
      });
    },
    [onActiveSpeechIndexChange, voice]
  );

  const startSpeech = useCallback(async () => {
    if (!speechRef.current) {
      return;
    }

    speechRunRef.current += 1;
    const runId = speechRunRef.current;
    await stopOtherReaders(readerIdRef.current);
    audioPlayerRef.current?.pause();
    setIsAudioPlaying(false);
    await speechRef.current.stop();
    markActiveReader(readerIdRef.current, () => stopReader());
    setIsSpeaking(true);
    speakAtIndex(activeSpeechIndex ?? speechIndexRef.current, runId);
  }, [activeSpeechIndex, speakAtIndex, stopReader]);

  const stopSpeech = useCallback(async () => {
    speechRunRef.current += 1;
    await speechRef.current?.stop();
    setIsSpeaking(false);
    clearActiveReader(readerIdRef.current);
    onActiveSpeechIndexChange(null);
  }, [onActiveSpeechIndexChange]);

  const resetPlayback = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await stopOtherReaders(readerIdRef.current);
    await stopReader(true);
  }, [stopReader]);

  const toggle = useCallback(async () => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 320;
    lastTapRef.current = now;

    if (isDoubleTap) {
      await resetPlayback();
      return;
    }

    if (toggleLockRef.current) {
      return;
    }

    toggleLockRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scheduleFade();
    scale.value = withSpring(0.94, { damping: 12 }, () => {
      scale.value = withSpring(1);
    });

    try {
      if (hasAudio) {
        speechRunRef.current += 1;
        await stopOtherReaders(readerIdRef.current);
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
          clearActiveReader(readerIdRef.current);
        } else {
          const isFinished =
            player.duration > 0 &&
            player.currentTime / player.duration >= 0.995;

          if (isFinished && player.seekTo) {
            await player.seekTo(0);
            setAudioProgress(0);
          } else {
            setAudioProgress(
              player.duration > 0 ? player.currentTime / player.duration : 0
            );
          }

          player.play();
          markActiveReader(readerIdRef.current, () => stopReader());
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
    } finally {
      toggleLockRef.current = false;
    }
  }, [
    hasAudio,
    isAudioPlaying,
    isSpeaking,
    onActiveSpeechIndexChange,
    resetPlayback,
    scale,
    scheduleFade,
    startSpeech,
    speechAvailable,
    stopReader,
    stopSpeech,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: 58 * (1 - fillProgress.value) }],
  }));
  const speechProgress =
    typeof activeSpeechIndex === "number" && speechSegments.length > 0
      ? (activeSpeechIndex + 1) / speechSegments.length
      : 1;
  const iconUsesAccent =
    (hasAudio && isAudioPlaying && audioProgress < 0.45) ||
    (!hasAudio && isSpeaking && speechProgress < 0.45);

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
        <Animated.View pointerEvents="none" style={[styles.fill, fillStyle]} />
        <Entypo
          name={isPlaying ? "controller-paus" : "controller-play"}
          size={27}
          color={iconUsesAccent ? Palette.accent : Palette.surface}
          style={styles.icon}
        />
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
    backgroundColor: "rgba(255, 255, 255, 0.34)",
    borderColor: "rgba(29, 111, 66, 0.2)",
    borderCurve: "continuous",
    borderRadius: 29,
    borderWidth: 1,
    boxShadow: "0 12px 28px rgba(29, 111, 66, 0.18)",
    height: 58,
    justifyContent: "center",
    overflow: "hidden",
    width: 58,
  },
  fill: {
    backgroundColor: "rgba(29, 111, 66, 0.58)",
    bottom: 0,
    height: 58,
    left: 0,
    position: "absolute",
    right: 0,
  },
  pressed: {
    opacity: 0.72,
  },
  icon: {
    zIndex: 1,
  },
});
