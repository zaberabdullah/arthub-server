import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db("arthub");

export const auth = betterAuth({
  database: mongodbAdapter(client, { 
    databaseName: "arthub",
  }),

  baseURL: process.env.BETTER_AUTH_URL, // http://localhost:3000
  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: [
    "http://localhost:3000", // client
    "http://localhost:5000"  // server - এটা must
  ],

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user", // "user" | "artist" | "admin"
        required: false,
        input: false, // ইউজার নিজে role চেঞ্জ করতে পারবে না
      },
    },
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
});

export default auth;