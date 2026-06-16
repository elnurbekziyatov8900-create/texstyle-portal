/**
 * api.js — JSON API endpoints
 * Mijozlar API chaqiruvlari orqali ham ulanishi mumkin (B.P4).
 *   GET /api/products          — barcha mahsulotlar
 *   GET /api/products/:id      — bitta mahsulot
 *   GET /api/stock/:sku        — jonli zaxira darajasi
 *   GET /api/status            — tizim holati (JSON)
 */
const express = require("express");
const db = require("../db/store");
const router = express.Router();
const START = Date.now();

router.get("/products", (req, res) => {
  const category = req.query.category;
  res.json({ ok: true, data: db.Products.all({ category }) });
});

router.get("/products/:id", (req, res) => {
  const p = db.Products.byId(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  res.json({ ok: true, data: p });
});

router.get("/stock/:sku", (req, res) => {
  const p = db.Products.bySku(req.params.sku);
  if (!p) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  res.json({ ok: true, sku: p.sku, name: p.name, stock: p.stock,
    status: p.stock > 50 ? "in_stock" : (p.stock > 0 ? "low_stock" : "out_of_stock") });
});

router.get("/status", (req, res) => {
  res.json({
    ok: true,
    service: "texstyle-portal",
    region: process.env.AWS_REGION || "eu-west-2",
    uptimeSeconds: Math.round((Date.now() - START) / 1000),
    products: db.Products.stats(),
    orders: db.Orders.stats(),
    customers: db.Customers.count(),
    node: process.version,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
