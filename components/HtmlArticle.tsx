import { useWindowDimensions } from "react-native";
import { defaultSystemFonts, RenderHTML } from "react-native-render-html";

import { Palette, Typography } from "@/constants/Design";

type HtmlArticleProps = {
  html: string;
};

const DAY_READING_PATTERN =
  /\b(Mon|Tue|Tues|Wed|Thu|Thur|Fri|Sat|Sun)\.?\s*\d+:/gi;

function textFromHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isSectionHeading(html: string): boolean {
  const text = textFromHtml(html);

  if (!text || text.length > 90) {
    return false;
  }

  const letters = text.replace(/[^A-Za-z]/g, "");

  if (!letters) {
    return false;
  }

  const uppercaseLetters = letters.replace(/[^A-Z]/g, "");

  return uppercaseLetters.length / letters.length > 0.8;
}

function formatDailyReadings(html: string): string {
  DAY_READING_PATTERN.lastIndex = 0;
  const matches = [...html.matchAll(DAY_READING_PATTERN)];

  if (matches.length < 2) {
    return html;
  }

  return matches
    .map((match, index) => {
      const nextMatch = matches[index + 1];
      const start = (match.index ?? 0) + match[0].length;
      const end = nextMatch?.index ?? html.length;
      const label = match[0].replace(/:$/, "").trim();
      const body = html.slice(start, end).trim();

      return `<p class="readingItem"><strong>${label}</strong> ${body}</p>`;
    })
    .join("");
}

function normalizeHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/br>/gi, "\n")
    .replace(/(\s*\n\s*){3,}/g, "\n\n")
    .replace(/<p class="\./g, '<p class="')
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
      if (isSectionHeading(inner)) {
        return `<h3>${inner}</h3>`;
      }

      const formatted = formatDailyReadings(inner);

      if (formatted !== inner) {
        return formatted;
      }

      return `<p>${inner}</p>`;
    })
    .replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, inner) => {
      if (isSectionHeading(inner)) {
        return `<h3>${inner}</h3>`;
      }

      const formatted = formatDailyReadings(inner);

      if (formatted !== inner) {
        return formatted;
      }

      return `<p${attrs}>${inner}</p>`;
    })
    .trim();
}

export function HtmlArticle({ html }: HtmlArticleProps) {
  const { width } = useWindowDimensions();
  const systemFonts = [
    ...defaultSystemFonts,
    Typography.reader,
    "Arial",
    "Times New Roman",
  ];
  const contentWidth = Math.min(width - 48, 720);

  return (
    <RenderHTML
      systemFonts={systemFonts}
      contentWidth={contentWidth}
      source={{ html: normalizeHtml(html) }}
      ignoredStyles={[
        "color",
        "fontFamily",
        "fontSize",
        "fontStyle",
        "fontWeight",
        "lineHeight",
        "marginBottom",
        "marginLeft",
        "marginRight",
        "marginTop",
      ]}
      baseStyle={{
        color: Palette.text,
        fontFamily: Typography.reader,
        fontSize: 19,
        lineHeight: 31,
      }}
      tagsStyles={{
        body: {
          color: Palette.text,
        },
        h2: {
          color: Palette.text,
          fontFamily: Typography.ui,
          fontSize: 28,
          fontWeight: "800",
          lineHeight: 36,
          marginBottom: 14,
          marginTop: 8,
        },
        p: {
          color: Palette.text,
          fontSize: 19,
          lineHeight: 31,
          marginTop: 0,
          marginBottom: 14,
        },
        div: {
          color: Palette.text,
          marginBottom: 12,
        },
        blockquote: {
          color: Palette.text,
          marginVertical: 10,
        },
        h3: {
          borderLeftColor: Palette.accent,
          borderLeftWidth: 4,
          color: Palette.text,
          fontFamily: Typography.ui,
          fontSize: 21,
          fontWeight: "800",
          lineHeight: 28,
          marginBottom: 12,
          marginTop: 18,
          paddingLeft: 14,
        },
        li: {
          color: Palette.text,
          fontSize: 19,
          lineHeight: 31,
          marginBottom: 8,
        },
      }}
      classesStyles={{
        date: {
          color: Palette.muted,
          fontFamily: Typography.ui,
          fontSize: 16,
          fontWeight: "600",
          lineHeight: 22,
          marginBottom: 4,
          marginTop: 0,
        },
        bibleRef: {
          color: Palette.text,
          fontFamily: Typography.reader,
          fontSize: 20,
          fontStyle: "italic",
          fontWeight: "400",
          lineHeight: 29,
          marginBottom: 4,
        },
        byline: {
          color: Palette.muted,
          fontFamily: Typography.ui,
          fontSize: 14,
          fontStyle: "normal",
          fontWeight: "700",
          lineHeight: 19,
          marginBottom: 20,
        },
        text: {
          marginTop: 8,
        },
        readingItem: {
          backgroundColor: Palette.surface,
          borderColor: Palette.border,
          borderRadius: 8,
          borderWidth: 1,
          fontSize: 18,
          lineHeight: 27,
          marginBottom: 10,
          paddingBottom: 12,
          paddingLeft: 14,
          paddingRight: 14,
          paddingTop: 12,
        },
      }}
    />
  );
}
