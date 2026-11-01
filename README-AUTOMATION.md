# Flavoriz Recipe Portal - Architecture & Automation Guide 🚀

Flavoriz is a full-stack recipe community application built with Express, MongoDB, and modern vanilla JavaScript.

---

### 🛡️ Production & Security Hardening
- **HTTP Security Headers**: Powered by `helmet` (protecting against XSS, clickjacking, MIME sniffing).
- **Rate Limiting**: `express-rate-limit` prevents brute-force login attempts and email-flooding on sensitive authentication routes (`/api/auth/*`).
- **Input Validation**: Schema validation using `zod` at the route level for strict type safety and sanitization.
- **Image Optimization & Cloud Storage**:
  - Image pipeline processes uploads via `sharp` (auto-orient, max 1200px resize, WebP compression).
  - Supports **Cloudinary** for persistent media on ephemeral cloud hosts (Render, Railway, Heroku), with seamless fallback to local disk storage in development.
- **Database Performance**:
  - Compound indexes on `{ author: 1, createdAt: -1 }`, `{ cuisine: 1, averageRating: -1 }`, and text index on `{ title, cuisine, ingredients }`.
  - `.lean()` queries for public listings to reduce memory footprint and latency.
  - Cursor/limit-offset pagination on feed endpoints (`/api/recipes?page=1&limit=12`).

---

### 📖 Interactive Swagger API Documentation
Interactive OpenAPI documentation is mounted at:
👉 **[http://localhost:5000/api-docs](http://localhost:5000/api-docs)**

Test endpoints, request bodies, auth headers, and response formats directly in your browser.

---

### 🌟 New Features
1. **Dynamic Portion Scaler**: Real-time ingredient measurement scaling based on user-selected servings on the recipe detail page.
2. **Community Reviews & Star Ratings**: 1-5 star ratings and reviews with auto-calculated averages.
3. **Favorites & Bookmarks**: Save recipes to your personal cookbook from recipe details and view them in your Profile.
4. **Pantry / "What's in My Fridge?" Finder**: Add ingredients you have on hand to find matching recipes ranked by ingredient availability.
5. **Feed Search & Filtering**: Multi-faceted filter by Cuisine, Dietary Preference (Vegan, Keto, Gluten-Free), Difficulty, and Sort order.

---

### 🛠️ Local Windows Automation Tooling (Located in `tooling/`)
- **Start Flavoriz**: Run [`tooling/Start-Flavoriz.bat`](file:///D:/Flavoriz-Recipe-Portal/tooling/Start-Flavoriz.bat) to launch the backend and open the browser.
- **Windows Auto-Start**: Run [`tooling/install-autostart.bat`](file:///D:/Flavoriz-Recipe-Portal/tooling/install-autostart.bat) to automatically start the backend silently whenever Windows boots.
- **Desktop Shortcut**: Run [`tooling/create-desktop-shortcut.bat`](file:///D:/Flavoriz-Recipe-Portal/tooling/create-desktop-shortcut.bat).
- **Stop Server**: Run [`tooling/Stop-Flavoriz.bat`](file:///D:/Flavoriz-Recipe-Portal/tooling/Stop-Flavoriz.bat).
