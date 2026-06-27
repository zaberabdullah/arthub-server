import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./lib/db.js";

import adminRoutes from "./routes/admin.js";
import artworkRoutes from "./routes/artworks.js";
import userRoutes from "./routes/users.js";
import commentRoutes from "./routes/comments.js";
import transactionRoutes from "./routes/transactions.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ArtHub server running 🎨" });
});

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/artworks", artworkRoutes);
app.use("/api/users", userRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/transactions", transactionRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running → http://localhost:${PORT}`);
  });
});
