import hymnData from "@/assets/data/hymns.json";

export type HymnVerse = {
  label: string;
  lines: string[];
};

export type Hymn = {
  number: number;
  title: string;
  category: string | null;
  meter: string | null;
  scripture: string | null;
  /** The verse quoted above the hymn, e.g. "Remember me, O Lord…". */
  scriptureText?: string | null;
  verses: HymnVerse[];
};

export const HYMNS = hymnData as Hymn[];

const byNumber = new Map(HYMNS.map((hymn) => [hymn.number, hymn]));

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const searchIndex = HYMNS.map((hymn) => ({
  hymn,
  text: normalize(
    [hymn.title, ...hymn.verses.flatMap((verse) => verse.lines)].join(" ")
  ),
}));

export function getHymn(number: number) {
  return byNumber.get(number);
}

/** Neighbouring hymns in book order, for previous/next navigation. */
export function getAdjacentHymns(number: number) {
  const index = HYMNS.findIndex((hymn) => hymn.number === number);
  return {
    previous: index > 0 ? HYMNS[index - 1] : undefined,
    next: index >= 0 && index < HYMNS.length - 1 ? HYMNS[index + 1] : undefined,
  };
}

/** Numbers match exactly first, then by prefix; words match title and lyrics. */
export function searchHymns(query: string): Hymn[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return HYMNS;
  }

  if (/^\d+$/.test(trimmed)) {
    const exact = byNumber.get(Number(trimmed));
    const prefix = HYMNS.filter(
      (hymn) => hymn !== exact && String(hymn.number).startsWith(trimmed)
    );
    return exact ? [exact, ...prefix] : prefix;
  }

  const needle = normalize(trimmed);

  if (!needle) {
    return HYMNS;
  }

  const titleMatches: Hymn[] = [];
  const lyricMatches: Hymn[] = [];

  for (const entry of searchIndex) {
    if (normalize(entry.hymn.title).includes(needle)) {
      titleMatches.push(entry.hymn);
    } else if (entry.text.includes(needle)) {
      lyricMatches.push(entry.hymn);
    }
  }

  return [...titleMatches, ...lyricMatches];
}
