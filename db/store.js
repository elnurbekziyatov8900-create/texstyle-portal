/**
 * TexStyle Portal — Data Access Layer
 * ------------------------------------------------------------
 * Bu qatlam ma'lumotlar bazasi vazifasini bajaradi. Mahalliy
 * (development / t3.micro) muhitda JSON fayl ishlatiladi — hech
 * qanday native kompilyatsiya talab qilmaydi va har qanday Node
 * versiyasida ishlaydi.
 *
 * ISHLAB CHIQARISH (Production): arxitektura diagrammasiga ko'ra
 * bu qatlam Amazon RDS (PostgreSQL, Multi-AZ) ga ulanadi.
 * Barcha so'rovlar shu yagona modul orqali o'tgani uchun, faqat
 * shu faylni almashtirish kifoya — qolgan kod o'zgarmaydi.
 * ------------------------------------------------------------
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "texstyle.json");

// Jadvallar (PostgreSQL'dagi table'larga mos): products, customers, orders
const EMPTY = { products: [], customers: [], orders: [], meta: { seq: { product: 0, customer: 0, order: 0 } } };

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function load() {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY, null, 2));
    return JSON.parse(JSON.stringify(EMPTY));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (e) {
    return JSON.parse(JSON.stringify(EMPTY));
  }
}

function save(db) {
  ensureDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function nextId(db, kind) {
  db.meta.seq[kind] = (db.meta.seq[kind] || 0) + 1;
  return db.meta.seq[kind];
}

// ---------- PRODUCTS (ERP — inventar / katalog) ----------
const Products = {
  all({ category } = {}) {
    const db = load();
    let rows = db.products;
    if (category && category !== "all") rows = rows.filter(p => p.category === category);
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },
  byId(id) {
    return load().products.find(p => p.id === Number(id)) || null;
  },
  bySku(sku) {
    return load().products.find(p => p.sku === sku) || null;
  },
  categories() {
    const db = load();
    return [...new Set(db.products.map(p => p.category))];
  },
  // Zaxirani kamaytirish (buyurtma berilganda) — WMS
  decrementStock(id, qty) {
    const db = load();
    const prod = db.products.find(p => p.id === Number(id));
    if (!prod) return false;
    if (prod.stock < qty) return false;
    prod.stock -= qty;
    save(db);
    return true;
  },
  create(p) {
    const db = load();
    const id = nextId(db, "product");
    const row = { id, ...p };
    db.products.push(row);
    save(db);
    return row;
  },
  stats() {
    const db = load();
    const totalStock = db.products.reduce((s, p) => s + p.stock, 0);
    const lowStock = db.products.filter(p => p.stock < 50).length;
    return { count: db.products.length, totalStock, lowStock };
  }
};

// ---------- CUSTOMERS (CRM — mijozlar) ----------
const Customers = {
  byEmail(email) {
    return load().customers.find(c => c.email.toLowerCase() === String(email).toLowerCase()) || null;
  },
  byId(id) {
    return load().customers.find(c => c.id === Number(id)) || null;
  },
  create(c) {
    const db = load();
    if (db.customers.some(x => x.email.toLowerCase() === c.email.toLowerCase())) {
      throw new Error("EMAIL_EXISTS");
    }
    const id = nextId(db, "customer");
    const row = { id, createdAt: new Date().toISOString(), role: "retailer", ...c };
    db.customers.push(row);
    save(db);
    return row;
  },
  count() {
    return load().customers.length;
  }
};

// ---------- ORDERS (WMS — buyurtmalar / bajarilish) ----------
const Orders = {
  create({ customerId, items }) {
    const db = load();
    const id = nextId(db, "order");
    let total = 0;
    const lineItems = items.map(it => {
      const prod = db.products.find(p => p.id === Number(it.productId));
      const lineTotal = prod.price * it.qty;
      total += lineTotal;
      return { productId: prod.id, sku: prod.sku, name: prod.name, price: prod.price, qty: it.qty, lineTotal };
    });
    const order = {
      id,
      ref: "TS-" + String(10000 + id),
      customerId: Number(customerId),
      items: lineItems,
      total: Math.round(total * 100) / 100,
      status: "Processing",      // Processing → Picked → Dispatched
      createdAt: new Date().toISOString()
    };
    db.orders.push(order);
    save(db);
    return order;
  },
  byCustomer(customerId) {
    return load().orders
      .filter(o => o.customerId === Number(customerId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  all() {
    const db = load();
    return db.orders
      .map(o => ({ ...o, customer: (db.customers.find(c => c.id === o.customerId) || {}).businessName || "—" }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  byId(id) {
    return load().orders.find(o => o.id === Number(id)) || null;
  },
  updateStatus(id, status) {
    const db = load();
    const o = db.orders.find(x => x.id === Number(id));
    if (!o) return false;
    o.status = status;
    save(db);
    return true;
  },
  stats() {
    const db = load();
    const total = db.orders.reduce((s, o) => s + o.total, 0);
    const pending = db.orders.filter(o => o.status !== "Dispatched").length;
    return { count: db.orders.length, revenue: Math.round(total * 100) / 100, pending };
  }
};

module.exports = { Products, Customers, Orders, load, save, DB_FILE, DATA_DIR };
