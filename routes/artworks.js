import express from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../lib/db.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

// ── GET /api/artworks ─────────────────────────────────────────────────
// Ekhon sold artwork o show korbe. Frontend e "Sold Out" badge dekhaba
router.get("/", async (req, res) => {
  try {
    const db = await getDB();
    const { 
      search = "", 
      category = "", 
      minPrice = 0, 
      maxPrice = 999999, 
      sort = "newest", 
      page = 1, 
      limit = 9,
      showSold // "true" | "false" | undefined
    } = req.query;

    const filter = { isPublished: true }; // isSold filter nai
    
    // Jodi explicitly sold hide korte chao
    if (showSold === "false") {
      filter.isSold = false;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } }, 
        { artistName: { $regex: search, $options: "i" } }
      ];
    }
    
    if (category) filter.category = category;
    filter.price = { $gte: Number(minPrice), $lte: Number(maxPrice) };

    const sortMap = { 
      newest: { createdAt: -1 }, 
      price_asc: { price: 1 }, 
      price_desc: { price: -1 } 
    };
    const skip = (Number(page) - 1) * Number(limit);

    const [artworks, total] = await Promise.all([
      db.collection("artworks")
        .find(filter)
        .sort(sortMap[sort] || sortMap.newest)
        .skip(skip)
        .limit(Number(limit))
        .toArray(),
      db.collection("artworks").countDocuments(filter),
    ]);

    res.json({ 
      artworks, 
      total, 
      page: Number(page), 
      totalPages: Math.ceil(total / Number(limit)) 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/artworks/featured ────────────────────────────────────────
// Featured e shudhu available gula dekhabo
router.get("/featured", async (req, res) => {
  try {
    const db = await getDB();
    const artworks = await db.collection("artworks")
      .find({ isPublished: true, isSold: false }) // Featured e available only
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();
    res.json(artworks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/artworks/my/list ─────────────────────────────────────────
// Artist er shob artwork, sold o dekhabe
router.get("/my/list", requireAuth, async (req, res) => {
  try {
    const db = await getDB();
    const artworks = await db.collection("artworks")
      .find({ artistId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(artworks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/artworks/:id ─────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const artwork = await db.collection("artworks")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!artwork) return res.status(404).json({ error: "Artwork not found." });
    res.json(artwork);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/artworks ────────────────────────────────────────────────
router.post("/", requireAuth, async (req, res) => {
  try {
    const db = await getDB();
    const { title, description, price, category, imageUrl } = req.body;
    if (!title || !description || !price || !category || !imageUrl) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const newArtwork = { 
      title, 
      description, 
      price: Number(price), 
      category, 
      imageUrl, 
      artistId: req.user.id, 
      artistName: req.user.name, 
      isSold: false, 
      isPublished: true, 
      createdAt: new Date() 
    };
    
    const result = await db.collection("artworks").insertOne(newArtwork);
    res.status(201).json({ ...newArtwork, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/artworks/:id ───────────────────────────────────────────
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const db = await getDB();
    const artwork = await db.collection("artworks")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!artwork) return res.status(404).json({ error: "Artwork not found." });
    if (artwork.artistId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden." });
    }

    const { title, description, price, category, imageUrl } = req.body;
    await db.collection("artworks").updateOne(
      { _id: new ObjectId(req.params.id) }, 
      { $set: { title, description, price: Number(price), category, imageUrl, updatedAt: new Date() } }
    );
    res.json({ message: "Artwork updated." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/artworks/:id/sell ──────────────────────────────────────
router.patch("/:id/sell", requireAuth, async (req, res) => {
  try {
    const db = await getDB();
    await db.collection("artworks").updateOne(
      { _id: new ObjectId(req.params.id) }, 
      { $set: { isSold: true, soldAt: new Date() } }
    );
    res.json({ message: "Artwork marked as sold." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/artworks/:id ──────────────────────────────────────────
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const db = await getDB();
    const artwork = await db.collection("artworks")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!artwork) return res.status(404).json({ error: "Artwork not found." });

    if (artwork.artistId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden." });
    }

    await db.collection("artworks").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: "Artwork deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
