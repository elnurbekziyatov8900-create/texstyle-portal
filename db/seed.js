/**
 * Seed — ma'lumotlar bazasini boshlang'ich ma'lumotlar bilan to'ldiradi.
 * Ishga tushirish:  npm run seed
 * 12 mahsulot (4 yo'nalish), 1 demo do'kon, 1 ombor admin, va namuna buyurtma.
 */
const bcrypt = require("bcryptjs");
const fs = require("fs");
const { DB_FILE, DATA_DIR } = require("./store");

// Mavjud bazani tozalab, qaytadan quramiz
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const PRODUCTS = [
  // Menswear
  { sku: "MW-TEE-01", name: "Heavyweight Cotton T-Shirt", category: "Menswear", price: 6.50, stock: 480, desc: "240gsm combed cotton, sizes S–5XL." },
  { sku: "MW-DEN-02", name: "Selvedge Denim Jeans", category: "Menswear", price: 18.90, stock: 220, desc: "14oz raw selvedge, straight fit." },
  { sku: "MW-KNT-03", name: "Lambswool Crew Knit", category: "Menswear", price: 14.25, stock: 36, desc: "Soft lambswool, six core colours." },
  // Womenswear
  { sku: "WW-DRS-01", name: "Tiered Midi Dress", category: "Womenswear", price: 16.80, stock: 310, desc: "Viscose blend, seasonal prints." },
  { sku: "WW-BLO-02", name: "Linen Blend Blouse", category: "Womenswear", price: 11.40, stock: 405, desc: "Breathable linen blend, sizes 6–22." },
  { sku: "WW-COO-03", name: "Ribbed Co-ord Set", category: "Womenswear", price: 21.00, stock: 28, desc: "Two-piece lounge set, high margin." },
  // Kidswear
  { sku: "KW-SCH-01", name: "School Polo 2-Pack", category: "Kidswear", price: 4.20, stock: 760, desc: "OEKO-TEX certified, ages 3–14." },
  { sku: "KW-JOG-02", name: "Kids Jogger Bottoms", category: "Kidswear", price: 5.10, stock: 540, desc: "Brushed fleece, elasticated waist." },
  { sku: "KW-RAI-03", name: "Puddle Rain Jacket", category: "Kidswear", price: 8.75, stock: 42, desc: "Waterproof, reflective trims." },
  // Accessories
  { sku: "AC-BAG-01", name: "Canvas Tote Bag", category: "Accessories", price: 3.30, stock: 900, desc: "12oz canvas, counter-top line." },
  { sku: "AC-BEL-02", name: "Leather Belt", category: "Accessories", price: 7.60, stock: 260, desc: "Full-grain leather, boxed." },
  { sku: "AC-CAP-03", name: "Five-Panel Cap", category: "Accessories", price: 4.90, stock: 48, desc: "Adjustable, embroidered eyelets." }
];

(function seed() {
  const db = JSON.parse(JSON.stringify({
    products: [], customers: [], orders: [],
    meta: { seq: { product: 0, customer: 0, order: 0 } }
  }));

  // Products
  PRODUCTS.forEach(p => {
    db.meta.seq.product += 1;
    db.products.push({ id: db.meta.seq.product, ...p });
  });

  // Demo retailer (CRM)
  db.meta.seq.customer += 1;
  db.customers.push({
    id: db.meta.seq.customer,
    businessName: "Demo Retail Ltd",
    email: "demo@retailer.co.uk",
    passwordHash: bcrypt.hashSync("texstyle2026", 10),
    role: "retailer",
    createdAt: new Date().toISOString()
  });

  // Warehouse admin (WMS)
  db.meta.seq.customer += 1;
  db.customers.push({
    id: db.meta.seq.customer,
    businessName: "TexStyle Warehouse (Admin)",
    email: "admin@texstyle.co.uk",
    passwordHash: bcrypt.hashSync("warehouse2026", 10),
    role: "admin",
    createdAt: new Date().toISOString()
  });

  // Namuna buyurtma (demo retailer'dan)
  db.meta.seq.order += 1;
  const p1 = db.products[0], p2 = db.products[3];
  db.orders.push({
    id: db.meta.seq.order,
    ref: "TS-10001",
    customerId: 1,
    items: [
      { productId: p1.id, sku: p1.sku, name: p1.name, price: p1.price, qty: 24, lineTotal: Math.round(p1.price * 24 * 100) / 100 },
      { productId: p2.id, sku: p2.sku, name: p2.name, price: p2.price, qty: 12, lineTotal: Math.round(p2.price * 12 * 100) / 100 }
    ],
    total: Math.round((p1.price * 24 + p2.price * 12) * 100) / 100,
    status: "Dispatched",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  });

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  console.log("Seed complete →", DB_FILE);
  console.log("  Products :", db.products.length);
  console.log("  Customers:", db.customers.length, "(demo@retailer.co.uk / admin@texstyle.co.uk)");
  console.log("  Orders   :", db.orders.length);
})();
