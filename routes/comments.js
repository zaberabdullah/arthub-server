import express from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../lib/db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

// ── GET /api/comments/:artworkId ──────────────────────────────────────
// Public — get all comments for an artwork
router.get("/:artworkId", async (req, res) => {
  try {
    const db = getDB();
    const comments = await db
      .collection("comments")
      .find({ artworkId: new ObjectId(req.params.artworkId) })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/comments ────────────────────────────────────────────────
// Protected — only buyers can comment
router.post("/", requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const { artworkId, comment } = req.body;

    if (!artworkId || !comment?.trim()) {
      return res.status(400).json({ error: "artworkId and comment are required." });
    }

    // Check if user purchased this artwork - handle string/ObjectId both
    const purchase = await db.collection("purchases").findOne({
      artworkId: new ObjectId(artworkId),
      $or: [
        { userId: new ObjectId(req.user.id) },
        { userId: req.user.id }
      ],
      status: "completed"
    });

    if (!purchase) {
      return res.status(403).json({ error: "Only buyers who purchased this artwork can comment." });
    }

    const newComment = {
      artworkId: new ObjectId(artworkId),
      userId: new ObjectId(req.user.id),
      userName: req.user.name,
      userImage: req.user.image,
      comment: comment.trim(),
      createdAt: new Date(),
    };

    const result = await db.collection("comments").insertOne(newComment);
    res.status(201).json({ ...newComment, _id: result.insertedId });
  } catch (err) {
    console.error("Comment error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/comments/:commentId ───────────────────────────────────
// Protected — comment owner only
router.patch("/:commentId", requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const { comment } = req.body;

    if (!comment?.trim()) {
      return res.status(400).json({ error: "Comment is required." });
    }

    const existing = await db
      .collection("comments")
      .findOne({ _id: new ObjectId(req.params.commentId) });

    if (!existing) return res.status(404).json({ error: "Comment not found." });
    
    // Handle ObjectId vs string comparison
    const isOwner = existing.userId.toString() === req.user.id;
    if (!isOwner) return res.status(403).json({ error: "Forbidden." });

    await db.collection("comments").updateOne(
      { _id: new ObjectId(req.params.commentId) },
      { $set: { comment: comment.trim(), updatedAt: new Date() } }
    );

    res.json({ message: "Comment updated." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/comments/:commentId ──────────────────────────────────
// Protected — comment owner or admin
router.delete("/:commentId", requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const existing = await db
      .collection("comments")
      .findOne({ _id: new ObjectId(req.params.commentId) });

    if (!existing) return res.status(404).json({ error: "Comment not found." });

    const isOwner = existing.userId.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden." });

    await db.collection("comments").deleteOne({ _id: new ObjectId(req.params.commentId) });
    res.json({ message: "Comment deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;