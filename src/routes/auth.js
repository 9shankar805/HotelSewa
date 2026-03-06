const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const { users } = require("../data/store");
const { JWT_SECRET } = require("../middleware/auth");
const { schemas, validate } = require("../lib/validate");

const authRouter = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

authRouter.post("/register", validate(schemas.auth.register), async (req, res) => {
  const { role, name, email, password } = req.validated;

  const normalizedEmail = email.toLowerCase();
  const existing = await users.findUnique({ where: { email: normalizedEmail } });
  if (existing) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await users.create({
    data: {
      role,
      name,
      email: normalizedEmail,
      passwordHash,
      verified: role !== "OWNER",
      profileComplete: role !== "OWNER",
    },
  });

  const token = jwt.sign({ sub: user.id, role: user.role, name: user.name }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return res.json({
    token,
    user: { id: user.id, role: user.role, name: user.name, email: user.email, verified: user.verified, profileComplete: user.profileComplete },
  });
});

authRouter.post("/login", validate(schemas.auth.login), async (req, res) => {
  const { email, password } = req.validated;

  const normalizedEmail = email.toLowerCase();
  const user = await users.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ sub: user.id, role: user.role, name: user.name }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return res.json({
    token,
    user: { id: user.id, role: user.role, name: user.name, email: user.email, verified: user.verified, profileComplete: user.profileComplete },
  });
});

authRouter.post("/google", validate(schemas.auth.google), async (req, res) => {
  const { credential, role } = req.validated;
  if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: "GOOGLE_CLIENT_ID not configured" });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "Invalid Google token" });
  }

  const email = (payload?.email || "").toLowerCase();
  if (!email) return res.status(400).json({ error: "Google account has no email" });

  const name = payload?.name || payload?.given_name || "Google User";

  const user = await users.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      role,
      verified: true,
      profileComplete: role !== "OWNER",
      googleSub: payload?.sub || null,
    },
  });

  const token = jwt.sign({ sub: user.id, role: user.role, name: user.name }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return res.json({
    token,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      verified: user.verified,
      profileComplete: user.profileComplete,
    },
  });
});

module.exports = { authRouter };
