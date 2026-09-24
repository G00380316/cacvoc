import { WEEKDAYS, type Post, type ServiceTime } from "@/constants/PostTypes";

/** "10:30" → "10:30 AM" in the device's locale. */
export function formatClockTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "Sunday · 10:30 AM" */
export function formatServiceTime(service: ServiceTime) {
  return `${WEEKDAYS[service.day] ?? ""} · ${formatClockTime(service.time)}`;
}

/** "Sat 12 Oct, 6:00 PM" (plus " – 8:00 PM" or an end date when there is one). */
export function formatEventWhen(startsAt: string | null, endsAt: string | null) {
  if (!startsAt) {
    return "";
  }

  const start = new Date(startsAt);
  const dateText = start.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeText = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (!endsAt) {
    return `${dateText}, ${timeText}`;
  }

  const end = new Date(endsAt);
  const sameDay = start.toDateString() === end.toDateString();
  const endText = sameDay
    ? end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : end.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });

  return `${dateText}, ${timeText} – ${endText}`;
}

/** Day and short month for an event's date badge, e.g. { day: "12", month: "OCT" }. */
export function eventBadge(startsAt: string | null) {
  if (!startsAt) {
    return null;
  }
  const date = new Date(startsAt);
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString([], { month: "short" }).toUpperCase(),
  };
}

/** "YYYY-MM-DD" → "Thursday 24 September" without timezone drift. */
export function formatDayKey(dayKey: string | null) {
  if (!dayKey) {
    return "";
  }
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Local calendar day as "YYYY-MM-DD". */
export function toDayKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "Posted 3 Sep" style caption from a post's createdAt. */
export function formatPostedDate(post: Pick<Post, "createdAt">) {
  return new Date(post.createdAt).toLocaleDateString([], { day: "numeric", month: "short" });
}
