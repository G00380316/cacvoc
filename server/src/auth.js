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
