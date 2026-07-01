import { getDB } from "../lib/db.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.headers["x-session-token"] || "";

    if (!token) {
      return res.status(401).json({ error: "Unauthorized. Please login." });
    }

    const db = getDB();
    const session = await db.collection("session").findOne({ token });

    if (!session) {
      return res.status(401).json({ error: "Invalid session." });
    }

   const user = await db.collection("user").findOne({ 
  $or: [
    { id: session.userId },
    { _id: session.userId },
  ]
});

    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Session check failed." });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized." });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden." });
    next();
  };
}