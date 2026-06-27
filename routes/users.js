import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../lib/db.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

const router = express.Router();

// ── GET /api/users/top-artists ─────────────────────────────────────
router.get("/top-artists", async (req, res) => {
  try {
    const db = getDB();
    const limit = Number(req.query.limit) || 3;

    const topArtists = await db
      .collection("purchases")
      .aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: "$artistId", totalSales: { $sum: 1 } } },
        { $sort: { totalSales: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "user", // ✅ Changed: users -> user
            localField: "_id",
            foreignField: "_id",
            as: "artistInfo",
          },
        },
        { $unwind: { path: "$artistInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: "$artistInfo.name",
            avatar: "$artistInfo.image",
            totalSales: 1,
          },
        },
      ])
      .toArray();

    res.json(topArtists);
  } catch (err) {
    console.error("Top artists error:", err);
    res.status(500).json([]);
  }
});

// ── GET /api/users ─────────────────────────────────────────────────
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const db = getDB();
    const users = await db
      .collection("user") // ✅ Changed: users -> user
      .find({}, { projection: { hashedPassword: 0, password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/users/:id/role ──────────────────────────────────────
router.patch("/:id/role", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const db = getDB();
    const { role } = req.body;

    if (!["user", "artist", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role." });
    }

    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: "Cannot change your own role." });
    }

    const result = await db
      .collection("user") // ✅ Changed: users -> user
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: { role } });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ message: "Role updated successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
