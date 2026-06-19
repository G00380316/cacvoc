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
