import express from "express";
import Stripe from "stripe";
import { getDB } from "../lib/db.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { ObjectId } from "mongodb";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ── POST /api/transactions/create-checkout-session ───────────────────
router.post("/create-checkout-session", requireAuth, async (req, res) => {
  const { artworkId } = req.body;
  const db = getDB();

  try {
    const artwork = await db.collection("artworks").findOne({ _id: new ObjectId(artworkId) });
    if (!artwork) {
      return res.status(404).json({ error: "Artwork not found." });
    }

    const priceInCents = Math.round(Number(artwork.price) * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      return res.status(400).json({ error: "Invalid artwork price." });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: artwork.title,
              images: [artwork.imageUrl],
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
      metadata: {
        artworkId: artworkId,
        buyerId: req.user.id,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe session error:", err);
    res.status(500).json({ error: "Failed to create payment session." });
  }
});

// ── POST /api/transactions/confirm-purchase ───────────────────────────
router.post("/confirm-purchase", requireAuth, async (req, res) => {
  const { sessionId } = req.body;
  const db = getDB();

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Stripe session not found." });
    }

    const { artworkId, buyerId } = session.metadata;
    if (req.user.id !== buyerId) {
      return res.status(403).json({ error: "Forbidden." });
    }

    const existingPurchase = await db.collection("purchases").findOne({ stripeSessionId: sessionId });
    if (existingPurchase) {
      return res.json(existingPurchase);
    }

    const artwork = await db.collection("artworks").findOne({ _id: new ObjectId(artworkId) });
    if (!artwork) {
      return res.status(404).json({ error: "Artwork not found." });
    }
    
    const artist = await db.collection("user").findOne({ _id: new ObjectId(artwork.artistId) });

    // STRING hishebe save koro - ObjectId na
    const purchase = {
      userId: buyerId, // string
      artworkId: artworkId, // string
      artistId: artwork.artistId, // string
      artworkTitle: artwork?.title,
      artistName: artist?.name || "Unknown Artist",
      artworkImage: artwork?.imageUrl,
      price: session.amount_total / 100,
      currency: session.currency,
      purchaseDate: new Date(),
      status: "completed",
      stripeSessionId: session.id,
      paymentIntentId: session.payment_intent,
    };

    const result = await db.collection("purchases").insertOne(purchase);
    await db.collection("artworks").updateOne(
      { _id: new ObjectId(artworkId) }, 
      { $set: { status: "sold", isSold: true } }
    );

    console.log("Purchase confirmed:", result.insertedId);
    res.status(201).json({ ...purchase, _id: result.insertedId });
  } catch (err) {
    console.error("Confirm purchase error:", err);
    res.status(500).json({ error: "Failed to confirm purchase." });
  }
});

// ── GET /api/transactions/my-purchases ───────────────────────────────
router.get("/my-purchases", requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    
    // String ar ObjectId duita diyei check
    const purchases = await db
      .collection("purchases")
      .find({ 
        $or: [
          { userId: userId },
          { userId: new ObjectId(userId) }
        ],
        status: "completed"
      })
      .sort({ purchaseDate: -1 })
      .toArray();
      
    res.json(purchases);
  } catch (err) {
    console.error("My purchases error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/transactions/all ────────────────────────────────────────
router.get("/all", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const db = getDB();
    
    const purchases = await db
      .collection("purchases")
      .find({ status: "completed" })
      .sort({ purchaseDate: -1 })
      .toArray();

    const transactions = await Promise.all(
      purchases.map(async (p) => {
        let buyer = null, artwork = null, artist = null;

        // Buyer lookup - string + ObjectId both
        try { 
          buyer = await db.collection("user").findOne({ 
            $or: [
              { _id: p.userId },
              { _id: new ObjectId(p.userId) }
            ]
          }); 
        } catch {}

        // Artwork lookup - string + ObjectId both
        try { 
          artwork = await db.collection("artworks").findOne({ 
            $or: [
              { _id: p.artworkId },
              { _id: new ObjectId(p.artworkId) }
            ]
          }); 
        } catch {}

        // Artist lookup - string + ObjectId both
        try { 
          if (artwork?.artistId || p.artistId) {
            const artistIdToFind = artwork?.artistId || p.artistId;
            artist = await db.collection("user").findOne({ 
              $or: [
                { _id: artistIdToFind },
                { _id: new ObjectId(artistIdToFind) }
              ]
            }); 
          }
        } catch {}

        return {
          _id: p._id,
          type: "purchase",
          amount: p.price,
          createdAt: p.purchaseDate,
          buyerEmail: buyer?.email || "—",
          buyerName: buyer?.name || "Unknown",
          artistEmail: artist?.email || "—",
          artistName: artist?.name || p.artistName || "Unknown",
          artworkTitle: artwork?.title || p.artworkTitle || "Unknown",
          stripeSessionId: p.stripeSessionId,
        };
      })
    );

    res.json(transactions);
  } catch (err) {
    console.error("Admin transactions error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/transactions/check/:artworkId ────────────────────────────
router.get("/check/:artworkId", requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const { artworkId } = req.params;
    
    const purchase = await db.collection("purchases").findOne({
      $or: [
        { artworkId: artworkId },
        { artworkId: new ObjectId(artworkId) }
      ],
      $or: [
        { userId: req.user.id },
        { userId: new ObjectId(req.user.id) }
      ],
      status: "completed"
    });

    res.json({ hasPurchased: !!purchase });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
