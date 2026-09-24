import express from "express";
import mongoose from "mongoose";

import { requireAdmin } from "./auth.js";
import { connectMongoDB } from "./db.js";
import { Church, Post, POST_TYPES } from "./models.js";
import {
  serializeChurch,
  serializePost,
  serializePosts,
  serializeServiceTimes,
} from "./serializers.js";
import {
  UPLOAD_CONTENT_TYPES,
  createImageUpload,
  deleteImage,
  isChurchImageKey,
  isStorageConfigured,
} from "./storage.js";

export const contentRouter = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const FEED_LIMIT = 20;
const FEED_DEVOTIONALS_LIMIT = 14;

const MAX_TITLE_LENGTH = 140;
const MAX_BODY_LENGTH = 10000;
const MAX_LOCATION_LENGTH = 200;
const MAX_PREACHER_LENGTH = 120;
const MAX_BIBLE_REF_LENGTH = 120;
const MAX_MEDIA_URL_LENGTH = 2000;
const MAX_IMAGE_KEY_LENGTH = 200;
const MAX_SERVICE_TIMES = 20;
const MAX_SERVICE_LABEL_LENGTH = 60;

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// An ISO 8601 date, or a date-time with a UTC offset like Date#toISOString() produces.
const DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}(T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,9})?)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d))?$/;
const CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const HTTP_URL_PATTERN = /^https?:\/\//i;

const CHURCH_NOT_FOUND = "Church not found";
const POST_NOT_FOUND = "Post not found";
const INVALID_TYPE = `type must be one of: ${POST_TYPES.join(", ")}`;

function isObjectId(value) {
  return mongoose.isObjectIdOrHexString(value);
}

function startOfUtcDay(date = new Date()) {
  return new Date(Math.floor(date.getTime() / DAY_MS) * DAY_MS);
}

function isValidDayKey(value) {
  if (typeof value !== "string" || !DAY_KEY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Overflowing days roll over (Feb 30 becomes Mar 2), so check that nothing moved.
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Missing, null and blank values all mean "not set".
function isBlank(value) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  );
}

function readText(input, field, maxLength) {
  const value = input[field];

  if (isBlank(value)) {
    return { value: null };
  }

  if (typeof value !== "string") {
    return { error: `${field} must be a string` };
  }

  const text = value.trim();

  if (text.length > maxLength) {
    return { error: `${field} must be ${maxLength} characters or fewer` };
  }

  return { value: text };
}

function readDateTime(input, field) {
  const value = input[field];

  if (isBlank(value)) {
    return { value: null };
  }

  const text = typeof value === "string" ? value.trim() : "";
  const date = new Date(text);

  if (
    !DATE_TIME_PATTERN.test(text) ||
    !isValidDayKey(text.slice(0, 10)) ||
    Number.isNaN(date.getTime())
  ) {
    return { error: `${field} must be an ISO 8601 date-time, e.g. 2026-10-04T18:00:00.000Z` };
  }

  return { value: date };
}

function readDayKey(input, field) {
  const value = input[field];

  if (isBlank(value)) {
    return { value: null };
  }

  const text = typeof value === "string" ? value.trim() : "";

  if (!isValidDayKey(text)) {
    return { error: `${field} must be a valid date in YYYY-MM-DD format` };
  }

  return { value: text };
}

function readMediaUrl(input) {
  const result = readText(input, "mediaUrl", MAX_MEDIA_URL_LENGTH);

  if (result.error || result.value === null) {
    return result;
  }

  if (!HTTP_URL_PATTERN.test(result.value) || !URL.canParse(result.value)) {
    return { error: "mediaUrl must be an http:// or https:// link" };
  }

  return result;
}

const FIELD_READERS = {
  startsAt: (input) => readDateTime(input, "startsAt"),
  endsAt: (input) => readDateTime(input, "endsAt"),
  location: (input) => readText(input, "location", MAX_LOCATION_LENGTH),
  preacher: (input) => readText(input, "preacher", MAX_PREACHER_LENGTH),
  mediaUrl: readMediaUrl,
  bibleRef: (input) => readText(input, "bibleRef", MAX_BIBLE_REF_LENGTH),
  date: (input) => readDayKey(input, "date"),
};

// The type-specific fields each type uses; the others are stored as null.
const TYPE_FIELDS = {
  announcement: [],
  event: ["startsAt", "endsAt", "location"],
  sermon: ["preacher", "mediaUrl", "bibleRef"],
  devotional: ["bibleRef", "date"],
};

const UNSET_TYPE_FIELDS = Object.fromEntries(
  Object.keys(FIELD_READERS).map((field) => [field, null])
);

/** Validates a PostInput body into the fields to store, or returns { error }. */
function parsePostInput(input, { churchId, currentType = null }) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "The request body must be a JSON object" };
  }

  if (!POST_TYPES.includes(input.type)) {
    return { error: INVALID_TYPE };
  }

  if (currentType && input.type !== currentType) {
    return { error: "A post's type can't be changed" };
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";

  if (!title) {
    return { error: "title is required" };
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return { error: `title must be ${MAX_TITLE_LENGTH} characters or fewer` };
  }

  const body = readText(input, "body", MAX_BODY_LENGTH);

  if (body.error) {
    return body;
  }

  const imageKey = readText(input, "imageKey", MAX_IMAGE_KEY_LENGTH);

  if (imageKey.error) {
    return imageKey;
  }

  if (imageKey.value !== null && !isChurchImageKey(imageKey.value, churchId)) {
    return { error: "imageKey must be an image uploaded for your church" };
  }

  const post = {
    type: input.type,
    title,
    body: body.value ?? "",
    imageKey: imageKey.value,
    ...UNSET_TYPE_FIELDS,
  };

  for (const field of TYPE_FIELDS[post.type]) {
    const result = FIELD_READERS[field](input);

    if (result.error) {
      return result;
    }

    post[field] = result.value;
  }

  if (post.type === "event") {
    if (!post.startsAt) {
      return { error: "Events need a start time (startsAt)" };
    }

    if (post.endsAt && post.endsAt < post.startsAt) {
      return { error: "endsAt can't be before startsAt" };
    }
  }

  if (post.type === "devotional" && !post.date) {
    return { error: "Devotionals need a date (date, as YYYY-MM-DD)" };
  }

  return { value: post };
}

function compareServiceTimes(a, b) {
  if (a.day !== b.day) {
    return a.day - b.day;
  }

  return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
}

function parseServiceTimes(input) {
  if (!Array.isArray(input)) {
    return { error: "serviceTimes must be a list" };
  }

  if (input.length > MAX_SERVICE_TIMES) {
    return { error: `You can add up to ${MAX_SERVICE_TIMES} service times` };
  }

  const serviceTimes = [];

  for (const [index, entry] of input.entries()) {
    const name = `Service time ${index + 1}`;

    if (!entry || typeof entry !== "object") {
      return { error: `${name} must have a day, time and label` };
    }

    const { day, time, label } = entry;

    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return { error: `${name}: day must be a whole number from 0 (Sunday) to 6 (Saturday)` };
    }

    if (typeof time !== "string" || !CLOCK_TIME_PATTERN.test(time)) {
      return { error: `${name}: time must be 24-hour HH:mm, e.g. 09:30` };
    }

    const text = typeof label === "string" ? label.trim() : "";

    if (!text || text.length > MAX_SERVICE_LABEL_LENGTH) {
      return { error: `${name}: label must be 1 to ${MAX_SERVICE_LABEL_LENGTH} characters` };
    }

    serviceTimes.push({ day, time, label: text });
  }

  return { value: serviceTimes.sort(compareServiceTimes) };
}

// Removes an image from S3 once no post of the church uses it. Best-effort: never throws.
function releaseImage(churchId, key) {
  if (!key || !isStorageConfigured()) {
    return;
  }

  Post.exists({ church: churchId, imageKey: key })
    .then((inUse) => (inUse ? undefined : deleteImage(key)))
    .catch((error) => {
      console.error(`[storage] Could not clean up ${key}: ${error.message}`);
    });
}

function requireApprovedChurch(req, res, next) {
  if (req.admin?.church?.status !== "approved") {
    res.status(403).json({ error: "Your church needs to be approved before you can post" });
    return;
  }

  next();
}

// Editor routes act on the signed-in admin's own church, which must be approved.
const editorAccess = [requireAdmin, requireApprovedChurch];

contentRouter.get("/churches/:id/feed", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      res.status(404).json({ error: CHURCH_NOT_FOUND });
      return;
    }

    await connectMongoDB();
    const church = await Church.findOne({ _id: req.params.id, status: "approved" }).lean();

    if (!church) {
      res.status(404).json({ error: CHURCH_NOT_FOUND });
      return;
    }

    const today = startOfUtcDay();
    const todayKey = today.toISOString().slice(0, 10);
    const postsOfType = (type, filter = {}) =>
      Post.find({ church: church._id, type, ...filter }).lean();
    const lists = await Promise.all([
      postsOfType("announcement").sort({ createdAt: -1 }).limit(FEED_LIMIT),
      // Upcoming or still running: (endsAt ?? startsAt) >= the start of today (UTC).
      postsOfType("event", {
        $or: [{ endsAt: { $gte: today } }, { endsAt: null, startsAt: { $gte: today } }],
      })
        .sort({ startsAt: 1, createdAt: 1 })
        .limit(FEED_LIMIT),
      postsOfType("sermon").sort({ createdAt: -1 }).limit(FEED_LIMIT),
      postsOfType("devotional", { date: { $lte: todayKey } })
        .sort({ date: -1, createdAt: -1 })
        .limit(FEED_DEVOTIONALS_LIMIT),
    ]);
    const [announcements, events, sermons, devotionals] = await Promise.all(
      lists.map((posts) => serializePosts(posts))
    );

    res.json({
      church: {
        ...serializeChurch(church),
        serviceTimes: serializeServiceTimes(church.serviceTimes),
      },
      announcements,
      events,
      sermons,
      devotionals,
    });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/posts/:id", async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) {
      res.status(404).json({ error: POST_NOT_FOUND });
      return;
    }

    await connectMongoDB();
    const post = await Post.findById(req.params.id).lean();
    const church = post
      ? await Church.findOne({ _id: post.church, status: "approved" }, "name").lean()
      : null;

    if (!church) {
      res.status(404).json({ error: POST_NOT_FOUND });
      return;
    }

    res.json({
      post: await serializePost(post),
      church: { id: String(church._id), name: church.name },
    });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/editor/posts", editorAccess, async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = { church: req.admin.church._id };

    if (type !== undefined && type !== "") {
      if (!POST_TYPES.includes(type)) {
        res.status(400).json({ error: INVALID_TYPE });
        return;
      }

      filter.type = type;
    }

    await connectMongoDB();
    const posts = await Post.find(filter).sort({ createdAt: -1 }).lean();

    res.json({ posts: await serializePosts(posts) });
  } catch (error) {
    next(error);
  }
});

contentRouter.post("/editor/posts", editorAccess, async (req, res, next) => {
  try {
    const church = req.admin.church;
    const input = parsePostInput(req.body, { churchId: String(church._id) });

    if (input.error) {
      res.status(400).json({ error: input.error });
      return;
    }

    await connectMongoDB();
    const post = await Post.create({
      ...input.value,
      church: church._id,
      author: req.admin._id,
    });

    res.status(201).json({ post: await serializePost(post) });
  } catch (error) {
    next(error);
  }
});

contentRouter.put("/editor/posts/:id", editorAccess, async (req, res, next) => {
  try {
    const churchId = req.admin.church._id;

    await connectMongoDB();
    // Scoped to the admin's church, so other churches' posts are simply "not found".
    const post = isObjectId(req.params.id)
      ? await Post.findOne({ _id: req.params.id, church: churchId })
      : null;

    if (!post) {
      res.status(404).json({ error: POST_NOT_FOUND });
      return;
    }

    const input = parsePostInput(req.body, {
      churchId: String(churchId),
      currentType: post.type,
    });

    if (input.error) {
      res.status(400).json({ error: input.error });
      return;
    }

    const previousImageKey = post.imageKey;

    post.set(input.value);
    await post.save();

    if (previousImageKey && previousImageKey !== post.imageKey) {
      releaseImage(churchId, previousImageKey);
    }

    res.json({ post: await serializePost(post) });
  } catch (error) {
    next(error);
  }
});

contentRouter.delete("/editor/posts/:id", editorAccess, async (req, res, next) => {
  try {
    const churchId = req.admin.church._id;

    await connectMongoDB();
    const post = isObjectId(req.params.id)
      ? await Post.findOneAndDelete({ _id: req.params.id, church: churchId })
      : null;

    if (!post) {
      res.status(404).json({ error: POST_NOT_FOUND });
      return;
    }

    releaseImage(churchId, post.imageKey);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/editor/service-times", editorAccess, (req, res) => {
  res.json({ serviceTimes: serializeServiceTimes(req.admin.church.serviceTimes) });
});

contentRouter.put("/editor/service-times", editorAccess, async (req, res, next) => {
  try {
    const input = parseServiceTimes(req.body?.serviceTimes);

    if (input.error) {
      res.status(400).json({ error: input.error });
      return;
    }

    await connectMongoDB();
    const church = req.admin.church;

    church.serviceTimes = input.value;
    await church.save();

    res.json({ serviceTimes: serializeServiceTimes(church.serviceTimes) });
  } catch (error) {
    next(error);
  }
});

contentRouter.get("/editor/config", editorAccess, (req, res) => {
  res.json({ uploadsEnabled: isStorageConfigured() });
});

contentRouter.post("/editor/uploads", editorAccess, async (req, res, next) => {
  try {
    if (!isStorageConfigured()) {
      res.status(503).json({ error: "Image uploads aren't set up yet" });
      return;
    }

    const contentType = req.body?.contentType;

    if (!UPLOAD_CONTENT_TYPES.includes(contentType)) {
      res
        .status(400)
        .json({ error: `contentType must be one of: ${UPLOAD_CONTENT_TYPES.join(", ")}` });
      return;
    }

    res.json(await createImageUpload(String(req.admin.church._id), contentType));
  } catch (error) {
    next(error);
  }
});
