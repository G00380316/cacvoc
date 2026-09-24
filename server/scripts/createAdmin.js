import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import readline from "node:readline";

import { connectMongoDB } from "../src/db.js";
import { Admin } from "../src/models.js";

const USAGE =
  "Usage: npm run create-admin -- --username NAME [--role admin|developer] [--password PASS]\n" +
  "Leave out --password to type it without it showing or being saved in your shell history.";

// Reads lines without echoing them, so passwords don't appear on screen.
function createHiddenPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: Boolean(process.stdin.isTTY),
  });
  let muted = false;
  rl._writeToOutput = (text) => {
    if (!muted) {
      rl.output.write(text);
    }
  };
  // The iterator queues lines, so piped input isn't lost between questions.
  const lines = rl[Symbol.asyncIterator]();

  return {
    async ask(question) {
      process.stdout.write(question);
      muted = true;
      const { value, done } = await lines.next();
      muted = false;
      if (process.stdin.isTTY) {
        process.stdout.write("\n");
      }
      if (done) {
        throw new Error("No password was entered");
      }
      return value;
    },
    close: () => rl.close(),
  };
}

async function readPassword(args) {
  if (typeof args.password === "string") {
    return args.password;
  }

  const prompt = createHiddenPrompt();

  try {
    const password = await prompt.ask("Password: ");
    const confirmation = await prompt.ask("Confirm password: ");

    if (password !== confirmation) {
      throw new Error("The passwords didn't match");
    }

    return password;
  } finally {
    prompt.close();
  }
}

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
  const role = args.role ?? "admin";

  if (!username) {
    throw new Error(`--username is required\n${USAGE}`);
  }

  if (!["admin", "developer"].includes(role)) {
    throw new Error(`--role must be "admin" or "developer"\n${USAGE}`);
  }

  const password = await readPassword(args);

  if (password.length < 8) {
    throw new Error(`The password must be at least 8 characters\n${USAGE}`);
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
