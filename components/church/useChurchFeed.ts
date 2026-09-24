import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, apiRequest } from "@/constants/Api";
import type { ChurchFeed } from "@/constants/PostTypes";

export type ChurchFeedState =
  | { status: "loading" }
  | {
      status: "ready";
      feed: ChurchFeed;
      /** Set when a pull-to-refresh failed; the feed that was already loaded stays on screen. */
      refreshError: string;
    }
  | { status: "error"; message: string }
  | { status: "notFound" };

type StoredState = ChurchFeedState & { churchId: string | null };

const LOADING: ChurchFeedState = { status: "loading" };

/**
 * Loads `GET /churches/:id/feed` for a registered church and reloads when the id changes.
 * Responses for a church that's no longer chosen, or superseded by a newer request, are dropped.
 */
export function useChurchFeed(churchId: string | null) {
  const [stored, setStored] = useState<StoredState>({ churchId: null, status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const latestRequest = useRef(0);

  const load = useCallback(async (id: string, background: boolean) => {
    const request = ++latestRequest.current;
    const isLatest = () => request === latestRequest.current;

    try {
      const feed = await apiRequest<ChurchFeed>(`/churches/${encodeURIComponent(id)}/feed`);
      if (isLatest()) {
        setStored({ churchId: id, status: "ready", feed, refreshError: "" });
      }
    } catch (error) {
      if (!isLatest()) {
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        setStored({ churchId: id, status: "notFound" });
        return;
      }
      const message = error instanceof Error ? error.message : "Couldn't load your church.";
      setStored((current) =>
        background && current.churchId === id && current.status === "ready"
          ? { ...current, refreshError: message }
          : { churchId: id, status: "error", message }
      );
    } finally {
      if (isLatest()) {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!churchId) {
      return;
    }

    // Keep a feed that's already showing for this church; anything else restarts at the skeleton.
    setStored((current) =>
      current.churchId === churchId && current.status === "ready"
        ? current
        : { churchId, status: "loading" }
    );
    load(churchId, false);

    return () => {
      // Whatever is still in flight belongs to the previous church.
      latestRequest.current += 1;
      setRefreshing(false);
    };
  }, [churchId, load]);

  /** Pull-to-refresh: reloads in the background, keeping the current feed visible. */
  const refresh = useCallback(() => {
    if (churchId) {
      setRefreshing(true);
      load(churchId, true);
    }
  }, [churchId, load]);

  /** Starts over from the loading state, e.g. after an error. */
  const retry = useCallback(() => {
    if (churchId) {
      setStored({ churchId, status: "loading" });
      load(churchId, false);
    }
  }, [churchId, load]);

  // Until the effect catches up with a newly chosen church, don't show the previous church's feed.
  const state: ChurchFeedState = churchId && stored.churchId === churchId ? stored : LOADING;

  return { state, refreshing, refresh, retry };
}
