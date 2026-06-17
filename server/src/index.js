import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";

import { requireMobileSecret } from "./auth.js";
import { connectMongoDB } from "./db.js";
import { SundaySchool, WFT } from "./models.js";
import { scrapeSundaySchool, scrapeWordForToday } from "./scrapers.js";

const app = express();
const port = process.env.PORT ?? 8000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/mobile", requireMobileSecret);
app.use("/admin", requireMobileSecret);

app.get("/mobile/wft", async (req, res, next) => {
  try {
    await connectMongoDB();
    const wft = await WFT.findOne().sort({ createdAt: -1 });
    res.json({ wft, response: wft });
  } catch (error) {
    next(error);
  }
});

app.get("/mobile/ss", async (req, res, next) => {
  try {
    await connectMongoDB();
    const sundaySchool = await SundaySchool.findOne().sort({ createdAt: -1 });
    res.json({ sundaySchool, response: { sundaySchool } });
  } catch (error) {
    next(error);
  }
});

app.get("/mobile/wft/list", async (req, res, next) => {
  try {
    await connectMongoDB();
    const wordfortodays = await WFT.find().sort({ createdAt: -1 });
    res.json({ wordfortodays });
  } catch (error) {
    next(error);
  }
});

app.get("/mobile/ss/list", async (req, res, next) => {
  try {
    await connectMongoDB();
    const sundaySchools = await SundaySchool.find().sort({ createdAt: -1 });
    res.json({ sundaySchools });
  } catch (error) {
    next(error);
  }
});

app.get("/mobile/wft/:id", async (req, res, next) => {
  try {
    await connectMongoDB();
    const wordfortoday = await WFT.findById(req.params.id);

    if (!wordfortoday) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({ wordfortoday });
  } catch (error) {
    next(error);
  }
});

app.get("/mobile/ss/:id", async (req, res, next) => {
  try {
    await connectMongoDB();
    const sundaySchool = await SundaySchool.findById(req.params.id);

    if (!sundaySchool) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({ sundaySchool });
  } catch (error) {
    next(error);
  }
});

app.post("/admin/scrape/wft", async (req, res, next) => {
  try {
    const targetUrl = req.body?.url ?? process.env.WFT_URL;

    if (!targetUrl) {
      res.status(400).json({ error: "A Word for Today URL is required" });
      return;
    }

    await connectMongoDB();
    const data = await scrapeWordForToday(targetUrl);

    if (!data.text || !data.title || !data.date) {
      res.status(422).json({ error: "Scrape did not return enough content", data });
      return;
    }

    const wft = await WFT.findOneAndUpdate(
      { date: data.date },
      { $set: data },
      { new: true, upsert: true }
    );

    res.json({ wft, message: "Scraping completed successfully" });
  } catch (error) {
    next(error);
  }
});

app.post("/admin/scrape/ss", async (req, res, next) => {
  try {
    const targetUrl = req.body?.url;

    if (!targetUrl) {
      res.status(400).json({ error: "A Sunday School URL is required" });
      return;
    }

    await connectMongoDB();
    const data = await scrapeSundaySchool(targetUrl);

    if (!data.text || !data.title) {
      res.status(422).json({ error: "Scrape did not return enough content", data });
      return;
    }

    const sundaySchool = await SundaySchool.findOneAndUpdate(
      { title: data.title },
      { $set: data },
      { new: true, upsert: true }
    );

    res.json({ sundaySchool, message: "Scraping completed successfully" });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  console.error(error);
  res.status(500).json({ error: error.message ?? "Internal Server Error" });
});

app.listen(port, () => {
  console.log(`CAC mobile backend listening on http://localhost:${port}`);
});
