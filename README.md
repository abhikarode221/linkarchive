# Links - Minimalist Link & Bookmark Manager

A clean, distraction-free web application to organize and manage your important web pages, documentation, and references with categories like **Important**, **Tech**, and **Business** — backed by **Node.js**, **Express**, and **MongoDB Atlas**.

Designed with a **minimalist light aesthetic** inspired by Linear, Apple, and Notion — prioritizing generous whitespace, calm typography, and zero visual clutter.

---

## ✨ Features

- **Minimalist Light Palette & Uncluttered Cards**:
  - Crisp canvas (`#f9fafb`) with pure white cards (`#ffffff`) and subtle borders (`#e4e4e7`).
  - Favicon + domain header, crisp titles, optional 2-line descriptions, and subtle hover actions (Copy, Edit, Delete, Open).
- **Fast Category Navigation**:
  - Notion-style category pills with live link counters and 1-click `+` button to add custom categories.
- **Productivity Controls**:
  - Real-time search across titles, URLs, tags, and categories.
  - Starred / Favorites filter toggle and sorting (Newest, Title A-Z, Most Visited, Oldest).
  - Dual layout toggle: **Grid View** and **List View**.
- **Home Page & Role-Based Access**:
  - **Public Home Page**: Anyone visiting the app can browse, search, filter, and open all public links shared to the Home page.
  - **Personal User Accounts**: Regular users can sign up or sign in to manage their own private links and categories under **My Links**.
  - **Admin Login & Visibility Controls**: Admin can sign in via **Admin Login** to manage all Home page links, toggle individual links between **Public** and **Private**, or use **Share All to Home** to publish all links to the Home page at once.
- **Node.js + Express + MongoDB Atlas Backend**:
  - Persistent cloud database storage via Mongoose schemas (`User`, `Link`, `Category`).
  - Cookie-based JWT authentication (`POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/admin-login`, `POST /api/auth/logout`, `GET /api/auth/me`) with `bcryptjs` password hashing.
  - Full REST API for public Home feeds, user-scoped links/categories, admin visibility management, visit tracking, favorites, sample reset, and JSON backup export/import.

---

## 📁 Project Structure

```
Link manager/
├── config/
│   └── db.js              # MongoDB Atlas connection helper
├── middleware/
│   └── auth.js            # JWT cookie verification middleware
├── models/
│   ├── Category.js        # Mongoose Category schema (per-user)
│   ├── Link.js            # Mongoose Link schema (per-user)
│   └── User.js            # Mongoose User schema
├── routes/
│   ├── auth.js            # Signup, login, admin login, logout, and session endpoints
│   ├── backup.js          # JSON export, import, and sample reset endpoints
│   ├── categories.js      # Category listing & creation endpoints
│   ├── links.js           # Link CRUD, visibility, favorite, and visit tracking endpoints
│   └── public.js          # Public Home page links, categories, and visit endpoints
├── utils/
│   └── seed.js            # New-user default seed & sample reset helpers
├── public/
│   ├── index.html         # Minimalist HTML5 structure, auth view & modals
│   ├── css/
│   │   └── style.css      # Minimalist light-theme CSS
│   └── js/
│       └── app.js         # Frontend auth, state & REST API client
├── server.js              # Express server entry point
├── package.json           # Dependencies & npm scripts
├── .env.example           # Environment variable template
├── start.bat              # 1-click Windows server & browser launcher
└── README.md              # Documentation & overview
```

---

## 🚀 Setup & How to Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure MongoDB Atlas**:
   - Copy `.env.example` to `.env`:
     ```bash
     copy .env.example .env
     ```
   - Open `.env` and replace `MONGODB_URI` with your MongoDB Atlas connection string:
     ```env
     MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/linkmanager?retryWrites=true&w=majority
     JWT_SECRET=replace-with-a-long-random-secret
     PORT=3000
     ```
   - In MongoDB Atlas, ensure your IP address is allowed under **Network Access**.

3. **Start the server**:
   ```bash
   npm start
   ```
   Or double-click **`start.bat`**. Then open `http://localhost:3000` in your browser.

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Server & MongoDB connection health check |
| `GET` | `/api/public/links` | Public Home page links (`visibility: 'public'`) |
| `GET` | `/api/public/categories` | Public Home page categories |
| `PATCH` | `/api/public/links/:id/visit` | Increment visit counter on a public Home link |
| `POST` | `/api/auth/signup` | Register a new user and seed starter private links |
| `POST` | `/api/auth/login` | Sign in with email & password |
| `POST` | `/api/auth/admin-login` | Sign in with an Admin account |
| `POST` | `/api/auth/logout` | Clear auth session cookie |
| `GET` | `/api/auth/me` | Get currently signed-in user |
| `GET` | `/api/links` | List user's links (supports `category`, `favorite`, `visibility`, `q`, `sort`) |
| `PATCH` | `/api/links/:id/visibility` | (Admin) Toggle or set link `public` / `private` |
| `PATCH` | `/api/links/share-all` | (Admin) Share all links to Home or make all private |
| `POST` | `/api/links` | Create a new link |
| `PUT` | `/api/links/:id` | Update an existing link |
| `PATCH` | `/api/links/:id/favorite` | Toggle or set starred status |
| `PATCH` | `/api/links/:id/visit` | Increment visit counter |
| `DELETE` | `/api/links/:id` | Delete a single link |
| `DELETE` | `/api/links` | Delete all links |
| `GET` | `/api/categories` | List all categories |
| `POST` | `/api/categories` | Create a new category |
| `GET` | `/api/backup/export` | Export categories and links as JSON |
| `POST` | `/api/backup/import` | Import categories and links from JSON |
| `POST` | `/api/backup/reset-sample` | Reset database to default sample links |
