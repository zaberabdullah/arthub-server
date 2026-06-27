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

// Fix: Function দিয়ে check করো
const allowedOrigins = process.env.CLIENT_URL.split(',');

app.use(cors({
  origin: function (origin, callback) {
    // Postman বা server-to-server request এর জন্য
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin); // Debug এর জন্য
      callback(null, false);
    }
  },
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
    console.log('Allowed Origins:', allowedOrigins); // এটা add করো debug এর জন্য
  });
});
