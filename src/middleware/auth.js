const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  console.warn("⚠️ Using fallback JWT_SECRET in development. Set JWT_SECRET in .env");
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, JWT_SECRET || "dev_secret");
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

module.exports = {
  JWT_SECRET,
  requireAuth,
  requireRole
};
