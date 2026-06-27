import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI');

export const client = new MongoClient(process.env.MONGODB_URI);
let db;

export async function connectDB() {
  if (db) return db;
  await client.connect(); // ← একবারই connect
  db = client.db(process.env.MONGODB_DB || "arthub");
  console.log("✅ MongoDB connected");
  return db;
}

export function getDB() {
  if (!db) throw new Error("DB not connected! Call connectDB() first.");
  return db;
}