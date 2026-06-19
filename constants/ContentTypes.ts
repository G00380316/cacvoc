export type WordForToday = {
  _id?: string;
  text?: string;
  title?: string;
  date?: string;
  bibleRef?: string;
  byline?: string;
  audio?: string | null;
};

export type SundaySchool = {
  _id?: string;
  audio?: string | null;
  text?: string;
  title?: string;
};
