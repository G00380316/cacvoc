import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeWordForToday(targetUrl) {
  const { data } = await axios.get(targetUrl);
  const $ = cheerio.load(data);

  let text = "";
  let title = "";
  let date = "";
  let bibleRef = "";
  let byline = "";
  let audio = "";

  $("div.field-item.even[property='content:encoded']").each((idx, el) => {
    text = `${$(el).children()}\n\n\n\n`;
  });
  $("div.panel-pane.pane-node-title").each((idx, el) => {
    title = `${$(el).children()}\n\n\n\n`;
  });
  $(".field-name-field-date-time").each((idx, el) => {
    date = `${$(el).children()}\n\n\n\n`;
  });
  $(".field-name-field-bible-reference").each((idx, el) => {
    bibleRef = `${$(el).children()}\n\n\n\n`;
  });
  $(".field-name-field-byline").each((idx, el) => {
    byline = `${$(el).children()}\n\n\n\n`;
  });
  $(".field-name-field-podcast").each((idx, el) => {
    audio = `${$(el).children()}\n\n`;
  });

  return { text, title, date, bibleRef, byline, audio };
}

export async function scrapeSundaySchool(targetUrl) {
  const { data } = await axios.get(targetUrl);
  const $ = cheerio.load(data);

  let text = "";
  let title = "";

  $(".entry-content").each((idx, el) => {
    text = `${$(el).children()}\n`;
  });

  text = text
    .replaceAll("<p", "</br><blockquote")
    .replaceAll("</p>", "</blockquote></br>")
    .replaceAll("<p>", "</br><blockquote>");

  $(".wp-block-cover__inner-container > div:nth-child(1) > div:nth-child(1)").each(
    (idx, el) => {
      title = `${$(el).children()}\n`;
    }
  );

  return { text, title };
}
