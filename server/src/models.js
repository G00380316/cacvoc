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
