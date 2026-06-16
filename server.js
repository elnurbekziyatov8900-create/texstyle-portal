/**
 * TexStyle Wholesale Ltd — B2B Trade Portal
 * Dynamic web application (Node.js + Express)
 * ------------------------------------------------------------
 *   ERP  → Product catalogue & live stock   (db.Products)
 *   CRM  → Retailer accounts & login         (db.Customers)
 *   WMS  → Orders & fulfilment status        (db.Orders)
 * ------------------------------------------------------------
 * Serves dynamic, server-rendered pages + a JSON API.
 * Runs behind Nginx reverse proxy on EC2 (port 3000).
 */
const path = require("path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const db = require("./db/store");
const pages = require("./routes/pages");
const api = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 3000;
const START = Date.now();

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/static", express.static(path.join(__dirname, "public")));
app.use(session({
  secret: process.env.SESSION_SECRET || "texstyle-dev-secret-change-in-prod",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8 soat
}));

// Har bir view uchun umumiy o'zgaruvchilar
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.cartCount = req.session.cart
    ? req.session.cart.reduce((s, i) => s + i.qty, 0) : 0;
  res.locals.path = req.path;
  res.locals.year = new Date().getFullYear();
  next();
});

// Health-check endpoint (ALB target health uchun) — A.P2 / C.M3
app.get("/health", (req, res) => {
  let dbOk = true;
  try { db.Products.stats(); } catch (e) { dbOk = false; }
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? "healthy" : "unhealthy",
    service: "texstyle-portal",
    uptimeSeconds: Math.round((Date.now() - START) / 1000),
    timestamp: new Date().toISOString()
  });
});

// Status (jonli tizim holati — statik saytdagi terminalning dinamik versiyasi)
app.get("/status", (req, res) => {
  const p = db.Products.stats();
  const o = db.Orders.stats();
  res.render("status", {
    title: "Tizim holati",
    uptime: Math.round((Date.now() - START) / 1000),
    region: process.env.AWS_REGION || "eu-west-2",
    productStats: p,
    orderStats: o,
    customerCount: db.Customers.count(),
    node: process.version
  });
});

// Routes
app.use("/", pages);
app.use("/api", api);

// 404
app.use((req, res) => {
  res.status(404).render("error", { title: "Topilmadi", code: 404,
    message: "Bu sahifa mavjud emas yoki ko'chirilgan." });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", { title: "Xatolik", code: 500,
    message: "Serverda kutilmagan xatolik yuz berdi." });
});

app.listen(PORT, () => {
  console.log(`TexStyle Portal → http://localhost:${PORT}  (PID ${process.pid})`);
});

module.exports = app;
