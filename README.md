# 🎨 ArtHub – Server Side (Backend)

This is the backend infrastructure for the **ArtHub** platform, developed using Node.js and Express. It serves as the core engine for managing art listings, user authentication, secure payment processing, and role-based data operations.

---

## 🛠 Tech Stack
* **Runtime:** Node.js
* **Framework:** Express.js (v5.2.1)
* **Database:** MongoDB (via Mongoose)
* **Authentication:** Better-Auth
* **Payment Gateway:** Stripe
* **Utilities:** Dotenv, CORS

---

## 🚀 Key Features
* **Role-Based Access Control (RBAC):** Middleware-protected routes to manage access for Admins, Artists, and Users.
* **Payment Integration:** Secure Stripe checkout session management and subscription tier tracking.
* **Art Management:** Full CRUD operations for artworks with integration for image hosting via imgBB.
* **Data Security:** Environment variable management to ensure database credentials and API secrets remain hidden.
* **Transaction History:** Centralized logging for subscriptions and artwork purchases.

---

## ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-backend-repo-link>
   cd arthub-server

```

2. **Install dependencies:**
```bash
npm install

```


3. **Configure Environment Variables:**
Create a `.env` file in the root directory and add:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
STRIPE_SECRET_KEY=your_stripe_secret_key

```


4. **Run the server:**
```bash
npm run dev

```



---

## 📂 Project Structure

* `/routes`: Contains modular API routes (admin.js, artworks.js, comments.js, transactions.js, users.js).
* `/middleware`: Handles token validation and request authorization.
* `/lib`: Contains authentication and database helper functions.

---

## 🔗 API Endpoints Overview

* **Authentication:** `POST /api/auth/register`, `POST /api/auth/login`
* **Artworks:** `GET /api/artworks`, `POST /api/artworks`, `DELETE /api/artworks/:id`
* **Transactions:** `POST /api/transactions/confirm`
* **Admin:** `PATCH /api/users/role/:id`

---

## 🤝 Contributor

* **Zaber Abdullah**


আপনার কি এই প্রজেক্টের ক্লায়েন্ট সাইড এবং সার্ভার সাইড রিপোজিটরিগুলোর মধ্যে কোনো লিঙ্কিং বা কানেকশন নিয়ে আর কোনো প্রশ্ন আছে?

```
