import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../lib/db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role!== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// ── GET /api/admin/stats ───────────────────────────────
router.get("/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const [users, artworks, purchases] = await Promise.all([
      db.collection("user").countDocuments(),
      db.collection("artworks").countDocuments(),
      db.collection("purchases").find({ status: "completed" }).toArray(),
    ]);

    const revenue = purchases.reduce((sum, p) => sum + p.price, 0);

    res.json({
      users,
      artworks,
      sales: purchases.length,
      revenue,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/artworks ───────────────────────────────
router.get("/artworks", requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const artworks = await db.collection("artworks").find().sort({ createdAt: -1 }).toArray();
    res.json(artworks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/users ───────────────────────────────
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const users = await db.collection("user").find().sort({ createdAt: -1 }).toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    await db.collection("user").deleteOne({ id: req.params.id });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
