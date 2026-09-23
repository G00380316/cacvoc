import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectMongoDB } from "../src/db.js";
import { Admin } from "../src/models.js";

const USAGE =
  "Usage: npm run create-admin -- --username NAME --password PASS [--role admin|developer]";

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, inlineValue] = arg.slice(2).split(/=(.*)/s);

    if (inlineValue !== undefined) {
      args[key] = inlineValue;
    } else {
      args[key] = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const username = typeof args.username === "string" ? args.username.trim().toLowerCase() : "";
  const password = typeof args.password === "string" ? args.password : "";
  const role = args.role ?? "admin";

  if (!username) {
    throw new Error(`--username is required\n${USAGE}`);
  }

  if (password.length < 8) {
    throw new Error(`--password must be at least 8 characters\n${USAGE}`);
  }

  if (!["admin", "developer"].includes(role)) {
    throw new Error(`--role must be "admin" or "developer"\n${USAGE}`);
  }

  await connectMongoDB();
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await Admin.findOne({ username });

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = role;
    await existing.save();
    console.log(`Updated admin "${username}" (role: ${role})`);
  } else {
    await Admin.create({ username, passwordHash, role });
    console.log(`Created admin "${username}" (role: ${role})`);
  }
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
    await mongoose.disconnect().catch(() => {});
  });
