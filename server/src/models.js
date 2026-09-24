import mongoose, { Schema } from "mongoose";

const WFTSchema = new Schema(
  {
    title: String,
    date: {
      type: String,
      unique: true,
      sparse: true,
    },
    bibleRef: String,
    byline: String,
    audio: String,
    text: String,
  },
  { timestamps: true }
);

const SundaySchoolSchema = new Schema(
  {
    title: {
      type: String,
      unique: true,
      sparse: true,
    },
    audio: String,
    text: String,
  },
  { timestamps: true }
);

export const WFT = mongoose.models.WFT || mongoose.model("WFT", WFTSchema);

export const SundaySchool =
  mongoose.models.SundaySchool ||
  mongoose.model("SundaySchool", SundaySchoolSchema);

export const POST_TYPES = ["announcement", "event", "sermon", "devotional"];

const ServiceTimeSchema = new Schema(
  {
    // 0 (Sunday) to 6 (Saturday)
    day: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
      validate: {
        validator: Number.isInteger,
        message: "day must be a whole number",
      },
    },
    // 24-hour "HH:mm"
    time: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
  },
  { _id: false }
);

const ChurchSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    latitude: Number,
    longitude: Number,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    reviewedAt: Date,
    serviceTimes: {
      type: [ServiceTimeSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const AdminSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "developer"],
      default: "admin",
    },
    church: {
      type: Schema.Types.ObjectId,
      ref: "Church",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

export const Church =
  mongoose.models.Church || mongoose.model("Church", ChurchSchema);

export const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);

// Fields that don't apply to a post's type are stored as null.
const PostSchema = new Schema(
  {
    church: {
      type: Schema.Types.ObjectId,
      ref: "Church",
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    type: {
      type: String,
      enum: POST_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    body: {
      type: String,
      maxlength: 10000,
      default: "",
    },
    // S3 object key of the attached image
    imageKey: {
      type: String,
      default: null,
    },
    // Events
    startsAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      maxlength: 200,
      default: null,
    },
    // Sermons
    preacher: {
      type: String,
      maxlength: 120,
      default: null,
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    // Sermons and devotionals
    bibleRef: {
      type: String,
      maxlength: 120,
      default: null,
    },
    // Devotionals: the day it's for, as "YYYY-MM-DD"
    date: {
      type: String,
      match: /^\d{4}-\d{2}-\d{2}$/,
      default: null,
    },
  },
  { timestamps: true }
);

// Every index leads with `church`, so each one also serves plain per-church lookups.
PostSchema.index({ church: 1, createdAt: -1 });
PostSchema.index({ church: 1, type: 1, createdAt: -1 });
PostSchema.index({ church: 1, type: 1, startsAt: 1, createdAt: 1 });
PostSchema.index({ church: 1, type: 1, date: -1, createdAt: -1 });

export const Post = mongoose.models.Post || mongoose.model("Post", PostSchema);
