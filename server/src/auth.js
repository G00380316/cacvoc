import jwt from "jsonwebtoken";

import { connectMongoDB } from "./db.js";
import { Admin } from "./models.js";

const ADMIN_TOKEN_EXPIRY = "30d";

export function requireMobileSecret(req, res, next) {
  if (!process.env.MOBILE_API_SECRET) {
    next();
    return;
  }

  const expected = `Bearer ${process.env.MOBILE_API_SECRET}`;

  if (req.headers.authorization !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

function getAdminJwtSecret() {
  if (!process.env.ADMIN_JWT_SECRET) {
    throw new Error("ADMIN_JWT_SECRET is required");
  }

  return process.env.ADMIN_JWT_SECRET;
}

export function signAdminToken(admin) {
  return jwt.sign({ sub: String(admin._id) }, getAdminJwtSecret(), {
    expiresIn: ADMIN_TOKEN_EXPIRY,
  });
}

export async function requireAdmin(req, res, next) {
  try {
    const token = req.headers["x-admin-token"];

    if (!token || typeof token !== "string") {
      res.status(401).json({ error: "Admin token required" });
      return;
    }

    let payload;

    try {
      payload = jwt.verify(token, getAdminJwtSecret());
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ error: "Invalid or expired admin token" });
        return;
      }

      throw error;
    }

    await connectMongoDB();
    const admin = payload?.sub
      ? await Admin.findById(payload.sub).populate("church").catch(() => null)
      : null;

    if (!admin) {
      res.status(401).json({ error: "Invalid or expired admin token" });
      return;
    }

    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireDeveloper(req, res, next) {
  if (req.admin?.role !== "developer") {
    res.status(403).json({ error: "Developer access required" });
    return;
  }

  next();
}
