import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";

import {
  requireAdmin,
  requireDeveloper,
  requireMobileSecret,
  signAdminToken,
} from "./auth.js";
import { contentRouter } from "./content.js";
import { connectMongoDB } from "./db.js";
import { haversineKm } from "./geo.js";
import { Admin, Church, SundaySchool, WFT } from "./models.js";
import { findCacChurchesNear } from "./osm.js";
import { scrapeSundaySchool, scrapeWordForToday } from "./scrapers.js";
import {
  serializeAdmin,
  serializeChurch,
  serializeChurchForReview,
} from "./serializers.js";

const app = express();
const port = process.env.PORT ?? 8000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/mobile", requireMobileSecret);
app.use("/admin", requireMobileSecret);
app.use("/auth", requireMobileSecret);
app.use("/churches", requireMobileSecret);
app.use("/editor", requireMobileSecret);
app.use("/dev", requireMobileSecret);
app.use("/posts", requireMobileSecret);

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 10;
const loginFailures = new Map();
const CHURCH_STATUSES = ["pending", "approved", "rejected"];

function getLoginFailureEntry(key) {
  const entry = loginFailures.get(key);

  if (entry && entry.resetAt <= Date.now()) {
    loginFailures.delete(key);
    return null;
  }

  return entry ?? null;
}

function recordLoginFailure(key) {
  const now = Date.now();

  for (const [storedKey, entry] of loginFailures) {
    if (entry.resetAt <= now) {
      loginFailures.delete(storedKey);
    }
  }

  const entry = getLoginFailureEntry(key);

  if (entry) {
    entry.count += 1;
  } else {
    loginFailures.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseCoordinate(value, min, max) {
  if (value === undefined || value === null || value === "") {
    return { value: undefined };
  }

  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number) || number < min || number > max) {
    return { error: true };
  }

  return { value: number };
}

app.post("/auth/login", async (req, res, next) => {
  try {
    const username =
      typeof req.body?.username === "string"
        ? req.body.username.trim().toLowerCase()
        : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";
    const limiterKey = `${username}|${req.ip}`;
    const failures = getLoginFailureEntry(limiterKey);

    if (failures && failures.count >= LOGIN_MAX_FAILURES) {
      res
        .status(429)
        .json({ error: "Too many failed login attempts. Try again later." });
      return;
    }

    await connectMongoDB();
    const admin = username
      ? await Admin.findOne({ username }).populate("church")
      : null;
    const valid =
      admin && password
        ? await bcrypt.compare(password, admin.passwordHash)
        : false;

    if (!valid) {
      recordLoginFailure(limiterKey);
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    loginFailures.delete(limiterKey);
    res.json({ token: signAdminToken(admin), admin: serializeAdmin(admin) });
  } catch (error) {
    next(error);
  }
});

app.get("/auth/me", requireAdmin, async (req, res, next) => {
  try {
    res.json({ admin: serializeAdmin(req.admin) });
  } catch (error) {
    next(error);
  }
});

app.get("/churches", async (req, res, next) => {
  try {
    const hasCoords = req.query.lat !== undefined || req.query.lng !== undefined;
    const lat = parseCoordinate(req.query.lat, -90, 90);
    const lng = parseCoordinate(req.query.lng, -180, 180);

    if (
      hasCoords &&
      (lat.error || lng.error || lat.value === undefined || lng.value === undefined)
    ) {
      res.status(400).json({ error: "lat and lng must be valid coordinates" });
      return;
    }

    await connectMongoDB();
    const docs = await Church.find({ status: "approved" }).sort({ name: 1 });
    let churches = docs.map(serializeChurch);

    if (hasCoords) {
      churches = churches
        .map((church) => ({
          ...church,
          distanceKm:
            typeof church.latitude === "number" &&
            typeof church.longitude === "number"
              ? Math.round(
                  haversineKm(lat.value, lng.value, church.latitude, church.longitude) *
                    10
                ) / 10
              : null,
        }))
        .sort((a, b) => {
          if (a.distanceKm === null) return b.distanceKm === null ? 0 : 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        });
    }

    res.json({ churches });
  } catch (error) {
    next(error);
  }
});

app.get("/churches/suggestions", async (req, res, next) => {
  try {
    const lat = parseCoordinate(req.query.lat, -90, 90);
    const lng = parseCoordinate(req.query.lng, -180, 180);

    if (lat.error || lng.error || lat.value === undefined || lng.value === undefined) {
      res.status(400).json({ error: "lat and lng must be valid coordinates" });
      return;
    }

    await connectMongoDB();
    const registered = await Church.find({ status: "approved" }, "latitude longitude").lean();

    res.json(await findCacChurchesNear(lat.value, lng.value, { exclude: registered }));
  } catch (error) {
    next(error);
  }
});

app.get("/editor/church", requireAdmin, async (req, res, next) => {
  try {
    res.json({ church: serializeChurch(req.admin.church) });
  } catch (error) {
    next(error);
  }
});

app.post("/editor/church", requireAdmin, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const { name, address, city, country } = body;

    if (!isNonEmptyString(name) || !isNonEmptyString(city) || !isNonEmptyString(country)) {
      res.status(400).json({ error: "name, city and country are required" });
      return;
    }

    if (address !== undefined && address !== null && typeof address !== "string") {
      res.status(400).json({ error: "address must be a string" });
      return;
    }

    const latitude = parseCoordinate(body.latitude, -90, 90);
    const longitude = parseCoordinate(body.longitude, -180, 180);

    if (latitude.error || longitude.error) {
      res.status(400).json({ error: "latitude and longitude must be valid coordinates" });
      return;
    }

    await connectMongoDB();
    const fields = {
      name: name.trim(),
      address: typeof address === "string" ? address.trim() : undefined,
      city: city.trim(),
      country: country.trim(),
      latitude: latitude.value,
      longitude: longitude.value,
    };
    const admin = req.admin;
    let church = admin.church;

    if (church?.status === "approved") {
      res.status(409).json({ error: "Your church is already approved" });
      return;
    }

    if (church) {
      church.set({ ...fields, status: "pending", reviewedAt: undefined });
      await church.save();
    } else {
      church = await Church.create({
        ...fields,
        status: "pending",
        submittedBy: admin._id,
      });
      admin.church = church._id;
      await admin.save();
    }

    res.json({ church: serializeChurch(church) });
  } catch (error) {
    next(error);
  }
});

app.get("/dev/churches", requireAdmin, requireDeveloper, async (req, res, next) => {
  try {
    const status = req.query.status ?? "pending";

    if (!CHURCH_STATUSES.includes(status)) {
      res.status(400).json({ error: "status must be pending, approved or rejected" });
      return;
    }

    await connectMongoDB();
    const churches = await Church.find({ status })
      .sort({ createdAt: -1 })
      .populate("submittedBy", "username");

    res.json({ churches: churches.map(serializeChurchForReview) });
  } catch (error) {
    next(error);
  }
});

async function reviewChurch(req, res, next, status) {
  try {
    await connectMongoDB();
    const church = await Church.findByIdAndUpdate(
      req.params.id,
      { $set: { status, reviewedAt: new Date() } },
      { new: true }
    );

    if (!church) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({ church: serializeChurch(church) });
  } catch (error) {
    next(error);
  }
}

app.post("/dev/churches/:id/approve", requireAdmin, requireDeveloper, (req, res, next) =>
  reviewChurch(req, res, next, "approved")
);

app.post("/dev/churches/:id/reject", requireAdmin, requireDeveloper, (req, res, next) =>
  reviewChurch(req, res, next, "rejected")
);

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

// Church posts, service times and image uploads. Mounted after the routes above so static
// paths like /churches/suggestions are matched before the /churches/:id/... routes.
app.use(contentRouter);

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
