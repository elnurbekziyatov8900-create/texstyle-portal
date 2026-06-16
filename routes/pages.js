/**
 * pages.js — Server-rendered dynamic pages
 * Landing, catalogue, auth (login/register/logout), basket,
 * checkout, order history, warehouse admin.
 */
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db/store");
const router = express.Router();

// ---- Auth guard'lar ----
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login?next=" + encodeURIComponent(req.originalUrl));
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.status(403).render("error", { title: "Ruxsat yo'q", code: 403,
      message: "Bu bo'lim faqat ombor (admin) hisobi uchun." });
  next();
}

// ---------- LANDING (dinamik statistika bilan) ----------
router.get("/", (req, res) => {
  const p = db.Products.stats();
  const o = db.Orders.stats();
  res.render("index", {
    title: "TexStyle Wholesale Ltd — UK kiyim-kechak ulgurji savdosi",
    productStats: p,
    orderStats: o,
    customerCount: db.Customers.count()
  });
});

// ---------- CATALOGUE (ERP — jonli zaxira) ----------
router.get("/catalogue", (req, res) => {
  const category = req.query.category || "all";
  const products = db.Products.all({ category });
  res.render("catalogue", {
    title: "Katalog",
    products,
    categories: db.Products.categories(),
    active: category
  });
});

// ---------- AUTH ----------
router.get("/login", (req, res) => {
  res.render("login", { title: "Kirish", error: null, next: req.query.next || "/dashboard" });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const c = db.Customers.byEmail(email || "");
  if (!c || !bcrypt.compareSync(password || "", c.passwordHash)) {
    return res.status(401).render("login", { title: "Kirish",
      error: "Email yoki parol noto'g'ri.", next: req.body.next || "/dashboard" });
  }
  req.session.user = { id: c.id, businessName: c.businessName, email: c.email, role: c.role };
  const dest = c.role === "admin" ? "/admin" : (req.body.next || "/dashboard");
  res.redirect(dest);
});

router.get("/register", (req, res) => {
  res.render("register", { title: "Trade hisob ochish", error: null });
});

router.post("/register", (req, res) => {
  const { businessName, email, password } = req.body;
  if (!businessName || !email || !password || password.length < 6) {
    return res.status(400).render("register", { title: "Trade hisob ochish",
      error: "Barcha maydonlarni to'ldiring (parol kamida 6 belgi)." });
  }
  try {
    const c = db.Customers.create({
      businessName, email,
      passwordHash: bcrypt.hashSync(password, 10),
      role: "retailer"
    });
    req.session.user = { id: c.id, businessName: c.businessName, email: c.email, role: c.role };
    res.redirect("/dashboard");
  } catch (e) {
    res.status(400).render("register", { title: "Trade hisob ochish",
      error: e.message === "EMAIL_EXISTS" ? "Bu email allaqachon ro'yxatdan o'tgan." : "Xatolik yuz berdi." });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ---------- BASKET (savat — sessiyada) ----------
router.post("/cart/add", requireLogin, (req, res) => {
  const productId = Number(req.body.productId);
  const qty = Math.max(1, Number(req.body.qty) || 1);
  const prod = db.Products.byId(productId);
  if (!prod) return res.redirect("/catalogue");
  if (!req.session.cart) req.session.cart = [];
  const existing = req.session.cart.find(i => i.productId === productId);
  if (existing) existing.qty += qty;
  else req.session.cart.push({ productId, qty });
  res.redirect("/cart");
});

router.get("/cart", requireLogin, (req, res) => {
  const cart = req.session.cart || [];
  const items = cart.map(i => {
    const p = db.Products.byId(i.productId);
    return { ...p, qty: i.qty, lineTotal: Math.round(p.price * i.qty * 100) / 100 };
  });
  const total = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
  res.render("cart", { title: "Savat", items, total });
});

router.post("/cart/remove", requireLogin, (req, res) => {
  const productId = Number(req.body.productId);
  req.session.cart = (req.session.cart || []).filter(i => i.productId !== productId);
  res.redirect("/cart");
});

// ---------- CHECKOUT (buyurtma berish — WMS) ----------
router.post("/checkout", requireLogin, (req, res) => {
  const cart = req.session.cart || [];
  if (!cart.length) return res.redirect("/catalogue");

  // Zaxirani tekshirish
  for (const i of cart) {
    const p = db.Products.byId(i.productId);
    if (!p || p.stock < i.qty) {
      return res.status(409).render("error", { title: "Zaxira yetarli emas", code: 409,
        message: `"${p ? p.name : 'Mahsulot'}" uchun yetarli zaxira yo'q.` });
    }
  }
  // Zaxirani kamaytirish + buyurtma yaratish
  cart.forEach(i => db.Products.decrementStock(i.productId, i.qty));
  const order = db.Orders.create({ customerId: req.session.user.id, items: cart });
  req.session.cart = [];
  res.redirect("/orders/" + order.id);
});

// ---------- DASHBOARD + ORDER HISTORY ----------
router.get("/dashboard", requireLogin, (req, res) => {
  const orders = db.Orders.byCustomer(req.session.user.id);
  const spend = Math.round(orders.reduce((s, o) => s + o.total, 0) * 100) / 100;
  res.render("dashboard", { title: "Boshqaruv paneli", orders, spend });
});

router.get("/orders/:id", requireLogin, (req, res) => {
  const order = db.Orders.byId(req.params.id);
  if (!order) return res.status(404).render("error", { title: "Topilmadi", code: 404, message: "Buyurtma topilmadi." });
  // O'z buyurtmasi yoki admin
  if (order.customerId !== req.session.user.id && req.session.user.role !== "admin")
    return res.status(403).render("error", { title: "Ruxsat yo'q", code: 403, message: "Bu buyurtma sizga tegishli emas." });
  res.render("order", { title: "Buyurtma " + order.ref, order });
});

// ---------- WAREHOUSE ADMIN (WMS) ----------
router.get("/admin", requireAdmin, (req, res) => {
  res.render("admin", {
    title: "Ombor paneli",
    orders: db.Orders.all(),
    productStats: db.Products.stats(),
    orderStats: db.Orders.stats(),
    products: db.Products.all()
  });
});

router.post("/admin/order/:id/status", requireAdmin, (req, res) => {
  db.Orders.updateStatus(req.params.id, req.body.status);
  res.redirect("/admin");
});

module.exports = router;
