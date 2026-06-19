import type { SundaySchool, WordForToday } from "@/constants/ContentTypes";
import { stripHtml } from "@/constants/Html";

const AUDIO_URL_PATTERN =
  /(https?:\/\/[^\s"'<>]+?\.(?:mp3|m4a|aac|wav|ogg)(?:\?[^\s"'<>]*)?)/i;

const AUDIO_ATTRIBUTE_PATTERN =
  /(?:src|href)=["']([^"']+\.(?:mp3|m4a|aac|wav|ogg)(?:\?[^"']*)?)["']/i;

const BIBLE_BOOK_ALIASES: Record<string, string> = {
  acts: "Acts",
  amos: "Amos",
  chron: "Chronicles",
  chronicles: "Chronicles",
  col: "Colossians",
  colossians: "Colossians",
  cor: "Corinthians",
  corinthians: "Corinthians",
  dan: "Daniel",
  daniel: "Daniel",
  deut: "Deuteronomy",
  deuteronomy: "Deuteronomy",
  ecc: "Ecclesiastes",
  ecclesiastes: "Ecclesiastes",
  eccl: "Ecclesiastes",
  eph: "Ephesians",
  ephesians: "Ephesians",
  est: "Esther",
  esth: "Esther",
  esther: "Esther",
  ex: "Exodus",
  exod: "Exodus",
  exodus: "Exodus",
  ezek: "Ezekiel",
  ezekiel: "Ezekiel",
  ezk: "Ezekiel",
  ezra: "Ezra",
  gal: "Galatians",
  galatians: "Galatians",
  gen: "Genesis",
  genesis: "Genesis",
  hab: "Habakkuk",
  habakkuk: "Habakkuk",
  hag: "Haggai",
  haggai: "Haggai",
  heb: "Hebrews",
  hebrews: "Hebrews",
  hos: "Hosea",
  hosea: "Hosea",
  isa: "Isaiah",
  isaiah: "Isaiah",
  jam: "James",
  james: "James",
  jas: "James",
  jdg: "Judges",
  jer: "Jeremiah",
  jeremiah: "Jeremiah",
  jes: "Joshua",
  job: "Job",
  joe: "Joel",
  joel: "Joel",
  joh: "John",
  john: "John",
  jon: "Jonah",
  jonah: "Jonah",
  jos: "Joshua",
  josh: "Joshua",
  joshua: "Joshua",
  jud: "Jude",
  jude: "Jude",
  judg: "Judges",
  judges: "Judges",
  lam: "Lamentations",
  lamentations: "Lamentations",
  lev: "Leviticus",
  leviticus: "Leviticus",
  lk: "Luke",
  luke: "Luke",
  mal: "Malachi",
  malachi: "Malachi",
  mar: "Mark",
  mark: "Mark",
  mat: "Matthew",
  matt: "Matthew",
  matthew: "Matthew",
  mic: "Micah",
  micah: "Micah",
  nah: "Nahum",
  nahum: "Nahum",
  neh: "Nehemiah",
  nehemiah: "Nehemiah",
  num: "Numbers",
  numbers: "Numbers",
  obad: "Obadiah",
  obadiah: "Obadiah",
  pet: "Peter",
  peter: "Peter",
  philem: "Philemon",
  philemon: "Philemon",
  phil: "Philippians",
  philippians: "Philippians",
  php: "Philippians",
  pro: "Proverbs",
  prov: "Proverbs",
  proverbs: "Proverbs",
  ps: "Psalms",
  psa: "Psalms",
  psalm: "Psalms",
  psalms: "Psalms",
  qoh: "Ecclesiastes",
  rev: "Revelation",
  revelation: "Revelation",
  rom: "Romans",
  romans: "Romans",
  rut: "Ruth",
  ruth: "Ruth",
  sam: "Samuel",
  samuel: "Samuel",
  sos: "Song of Solomon",
  song: "Song of Solomon",
  "song of songs": "Song of Solomon",
  "song of solomon": "Song of Solomon",
  ss: "Song of Solomon",
  thes: "Thessalonians",
  thess: "Thessalonians",
  thessalonians: "Thessalonians",
  tim: "Timothy",
  timothy: "Timothy",
  tit: "Titus",
  titus: "Titus",
  zec: "Zechariah",
  zech: "Zechariah",
  zechariah: "Zechariah",
  zep: "Zephaniah",
  zeph: "Zephaniah",
  zephaniah: "Zephaniah",
};

const BIBLE_BOOK_PATTERN = Object.keys(BIBLE_BOOK_ALIASES)
  .sort((a, b) => b.length - a.length)
  .map((book) => book.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
  .join("|");

const BIBLE_REFERENCE_PATTERN = new RegExp(
  String.raw`\b(?:(1|2|3)\s*)?(${BIBLE_BOOK_PATTERN})\.?\s+(\d+)(?::(\d+)(?:\s*[-–—]\s*(?:(\d+):)?(\d+))?)?`,
  "gi"
);

const ORDINAL_BOOK_PREFIXES: Record<string, string> = {
  "1": "First",
  "2": "Second",
  "3": "Third",
};

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

export function buildSundaySchoolSpeechSegments(item: SundaySchool): string[] {
  return [stripHtml(item.title), ...htmlToParagraphs(item.text)].filter(Boolean);
}

export function prepareTextForSpeech(text: string): string {
  return text
    .replace(
      BIBLE_REFERENCE_PATTERN,
      (
        _,
        prefix: string | undefined,
        rawBook: string,
        chapter: string,
        verse: string | undefined,
        endChapter: string | undefined,
        endVerse: string | undefined
      ) => {
        const book = BIBLE_BOOK_ALIASES[rawBook.toLowerCase().replace(/\s+/g, " ")] ?? rawBook;
        const fullBook = prefix ? `${ORDINAL_BOOK_PREFIXES[prefix]} ${book}` : book;

        if (!verse) {
          return `${fullBook} chapter ${chapter}`;
        }

        if (endChapter && endVerse) {
          return `${fullBook} chapter ${chapter}, verse ${verse}, to chapter ${endChapter}, verse ${endVerse}`;
        }

        const verseLabel = endVerse ? `verses ${verse} to ${endVerse}` : `verse ${verse}`;

        return `${fullBook} chapter ${chapter}, ${verseLabel}`;
      }
    )
    .replace(/\bNKJV\b/g, "New King James Version")
    .replace(/\bNIV\b/g, "New International Version")
    .replace(/\bKJV\b/g, "King James Version")
    .replace(/\bESV\b/g, "English Standard Version")
    .replace(/\bff\.?\b/gi, "and following verses")
    .replace(/\bf\.?\b/gi, "and the following verse")
    .replace(/\s*[;]\s*/g, ", ")
    .replace(/\s*[–—]\s*/g, ", ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}
