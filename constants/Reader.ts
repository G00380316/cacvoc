import type { WordForToday } from "@/constants/ContentTypes";
import { stripHtml } from "@/constants/Html";

const AUDIO_URL_PATTERN =
  /(https?:\/\/[^\s"'<>]+?\.(?:mp3|m4a|aac|wav|ogg)(?:\?[^\s"'<>]*)?)/i;

const AUDIO_ATTRIBUTE_PATTERN =
  /(?:src|href)=["']([^"']+\.(?:mp3|m4a|aac|wav|ogg)(?:\?[^"']*)?)["']/i;

function decodeHtmlEntities(value: string): string {
  return value.replace(/&amp;/g, "&").trim();
}

export function extractAudioUrl(audio?: string | null): string | null {
  if (!audio) {
    return null;
  }

  const directMatch = audio.match(AUDIO_URL_PATTERN);
  const attributeMatch = audio.match(AUDIO_ATTRIBUTE_PATTERN);
  const url = directMatch?.[1] ?? attributeMatch?.[1];

  return url ? decodeHtmlEntities(url) : null;
}

export function htmlToParagraphs(html?: string | null): string[] {
  if (!html) {
    return [];
  }

  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/blockquote>/gi, "\n");

  return withBreaks
    .split(/\n+/)
    .map(stripHtml)
    .filter(Boolean);
}

export function buildWordForTodaySpeechSegments(item: WordForToday): string[] {
  return [
    stripHtml(item.title),
    stripHtml(item.date),
    stripHtml(item.bibleRef),
    stripHtml(item.byline),
    ...htmlToParagraphs(item.text),
  ].filter(Boolean);
}
