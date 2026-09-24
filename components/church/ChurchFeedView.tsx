import { useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInUp, LinearTransition } from "react-native-reanimated";

import {
  AnnouncementCard,
  DevotionalCard,
  EventCard,
  SermonCard,
  staggerDelay,
} from "@/components/church/PostCards";
import { sortServiceTimes } from "@/components/church/postDisplay";
import type { AppPalette } from "@/constants/Design";
import { formatServiceTime } from "@/constants/PostFormat";
import type { ChurchFeed, ServiceTime } from "@/constants/PostTypes";
import { useThemedStyles } from "@/contexts/ThemeContext";

type ChurchFeedViewProps = {
  feed: ChurchFeed;
  /** Shown above the sections when a pull-to-refresh failed but the earlier feed is still showing. */
  refreshError?: string;
};

/** A church's service times and posts. Sections without content are left out. */
export function ChurchFeedView({ feed, refreshError }: ChurchFeedViewProps) {
  const styles = useThemedStyles(createStyles);
  const serviceTimes = useMemo(
    () => sortServiceTimes(feed.church.serviceTimes),
    [feed.church.serviceTimes]
  );
  const { events, announcements, sermons, devotionals } = feed;

  // Cards cascade in page order, so each section carries on from the previous one's count.
  const eventsStart = serviceTimes.length > 0 ? 1 : 0;
  const announcementsStart = eventsStart + events.length;
  const sermonsStart = announcementsStart + announcements.length;
  const devotionalsStart = sermonsStart + sermons.length;
  const isEmpty =
    serviceTimes.length +
      events.length +
      announcements.length +
      sermons.length +
      devotionals.length ===
    0;

  return (
    <View style={styles.feed}>
      {refreshError ? (
        <Animated.Text entering={FadeIn.duration(250)} selectable style={styles.refreshError}>
          {refreshError}
        </Animated.Text>
      ) : null}

      {isEmpty ? (
        <Animated.Text entering={FadeIn.duration(250)} style={styles.empty}>
          No posts yet — check back soon.
        </Animated.Text>
      ) : null}

      {serviceTimes.length > 0 ? (
        <FeedSection title="Service times" index={0}>
          <ServiceTimesCard serviceTimes={serviceTimes} />
        </FeedSection>
      ) : null}

      {events.length > 0 ? (
        <FeedSection title="Upcoming events" index={eventsStart}>
          {events.map((post, index) => (
            <EventCard key={post.id} post={post} index={eventsStart + index} />
          ))}
        </FeedSection>
      ) : null}

      {announcements.length > 0 ? (
        <FeedSection title="Announcements" index={announcementsStart}>
          {announcements.map((post, index) => (
            <AnnouncementCard key={post.id} post={post} index={announcementsStart + index} />
          ))}
        </FeedSection>
      ) : null}

      {sermons.length > 0 ? (
        <FeedSection title="Sermons" index={sermonsStart}>
          {sermons.map((post, index) => (
            <SermonCard key={post.id} post={post} index={sermonsStart + index} />
          ))}
        </FeedSection>
      ) : null}

      {devotionals.length > 0 ? (
        <FeedSection title="Devotionals" index={devotionalsStart}>
          {devotionals.map((post, index) => (
            <DevotionalCard key={post.id} post={post} index={devotionalsStart + index} />
          ))}
        </FeedSection>
      ) : null}
    </View>
  );
}

function FeedSection({
  title,
  index,
  children,
}: {
  title: string;
  /** Page position of the section's first card, so the label arrives with it. */
  index: number;
  children: ReactNode;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    // Layout transitions let later sections shift smoothly when a refresh adds or removes cards.
    <Animated.View layout={LinearTransition.duration(220)} style={styles.section}>
      <Animated.Text
        accessibilityRole="header"
        entering={FadeIn.duration(250).delay(staggerDelay(index))}
        style={styles.sectionTitle}
      >
        {title}
      </Animated.Text>
      <View style={styles.cards}>{children}</View>
    </Animated.View>
  );
}

function ServiceTimesCard({ serviceTimes }: { serviceTimes: ServiceTime[] }) {
  const styles = useThemedStyles(createStyles);

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      layout={LinearTransition.duration(220)}
      style={styles.serviceCard}
    >
      {serviceTimes.map((service, index) => (
        <View
          key={`${service.day}-${service.time}-${index}`}
          style={[styles.serviceRow, index > 0 ? styles.serviceDivider : undefined]}
        >
          <Text style={styles.serviceLabel}>{service.label.trim() || "Service"}</Text>
          <Text style={styles.serviceTime}>{formatServiceTime(service)}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    feed: {
      gap: 28,
    },
    section: {
      gap: 10,
    },
    sectionTitle: {
      color: palette.muted,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    cards: {
      gap: 12,
    },
    serviceCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderCurve: "continuous",
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: "hidden",
    },
    serviceRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      minHeight: 50,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    serviceDivider: {
      borderTopColor: palette.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    serviceLabel: {
      color: palette.text,
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      lineHeight: 21,
    },
    serviceTime: {
      color: palette.muted,
      fontSize: 15,
      fontVariant: ["tabular-nums"],
      textAlign: "right",
    },
    refreshError: {
      color: palette.danger,
      fontSize: 14,
      lineHeight: 20,
    },
    empty: {
      color: palette.muted,
      fontSize: 16,
      lineHeight: 23,
      paddingVertical: 24,
      textAlign: "center",
    },
  });
