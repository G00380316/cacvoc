import { formatDayKey, formatEventWhen, formatPostedDate } from "@/constants/PostFormat";
import { POST_TYPES, type Post, type PostType, type ServiceTime } from "@/constants/PostTypes";

/** "Sermon", "Event", … for a post type. */
export function postTypeLabel(type: PostType) {
  return POST_TYPES.find((entry) => entry.type === type)?.label ?? "Post";
}

/** Joins whichever parts are present with " · ". */
export function joinMeta(...parts: (string | null | undefined)[]) {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ");
}

/** "Posted 3 Sep" */
export function postedCaption(post: Pick<Post, "createdAt">) {
  return `Posted ${formatPostedDate(post)}`;
}

/** The detail screen's meta lines for a post, depending on its type. */
export function postMetaLines(post: Post): string[] {
  switch (post.type) {
    case "event":
      return [formatEventWhen(post.startsAt, post.endsAt), post.location?.trim() ?? ""].filter(
        Boolean
      );
    case "sermon":
      return [joinMeta(post.preacher, post.bibleRef)].filter(Boolean);
    case "devotional":
      return [joinMeta(formatDayKey(post.date), post.bibleRef)].filter(Boolean);
    default:
      return [postedCaption(post)];
  }
}

/** Collapses whitespace so a few-line preview isn't padded out with blank lines. */
export function previewText(body: string) {
  return body.replace(/\s+/g, " ").trim();
}

/** Normalises line endings and caps paragraph breaks at one blank line for reading. */
export function readerText(body: string) {
  return body
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * The in-app browser only opens http(s) links, so links typed without a scheme
 * ("youtube.com/…") get https:// and the scheme is lower-cased.
 */
export function toWebUrl(url: string) {
  const trimmed = url.trim();
  const scheme = /^[a-z][a-z\d+.-]*:\/\//i.exec(trimmed)?.[0];
  return scheme
    ? scheme.toLowerCase() + trimmed.slice(scheme.length)
    : `https://${trimmed}`;
}

/** Weekly services in week order (Sunday first), then by time of day. */
export function sortServiceTimes(serviceTimes: ServiceTime[]) {
  const minutes = (time: string) => {
    const [hours, mins] = time.split(":").map(Number);
    return (hours || 0) * 60 + (mins || 0);
  };
  return [...serviceTimes].sort((a, b) => a.day - b.day || minutes(a.time) - minutes(b.time));
}
