require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { Pool } = require("pg");
const path = require("path");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

/* ---------- Servir le frontend ---------- */
app.use(express.static(path.join(__dirname, "public")));

/* ---------- Cloudinary ---------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/* ---------- PostgreSQL ---------- */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ---------- Init tables ---------- */
pool.query(`
  CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    categorie TEXT NOT NULL,
    nom TEXT NOT NULL,
    montant NUMERIC NOT NULL,
    localisation TEXT NOT NULL,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).then(() => console.log("Table articles OK")).catch(err => console.error("Erreur table articles:", err));

pool.query(`
  CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).then(async () => {
  console.log("Table categories OK");
  // Insère les catégories par défaut si la table est vide
  const check = await pool.query("SELECT COUNT(*) FROM categories");
  if (parseInt(check.rows[0].count) === 0) {
    await pool.query(
      "INSERT INTO categories (slug, label) VALUES ($1,$2),($3,$4),($5,$6)",
      ["hidjab", "Hidjab", "bonnet", "Bonnet", "chaussure", "Chaussure"]
    );
    console.log("Catégories par défaut insérées");
  }
}).catch(err => console.error("Erreur table categories:", err));

/* ---------- Routes API : Articles ---------- */

// GET tous les articles
app.get("/articles", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM articles ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET articles par catégorie
app.get("/articles/:categorie", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM articles WHERE categorie=$1 ORDER BY id DESC",
      [req.params.categorie]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST ajouter un article avec image
app.post("/articles", upload.single("image"), async (req, res) => {
  try {
    const { categorie, nom, montant, localisation, description } = req.body;
    let image_url = "";

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: "boutique" },
          (error, result) => error ? reject(error) : resolve(result)
        ).end(req.file.buffer);
      });
      image_url = result.secure_url;
    }

    const db = await pool.query(
      "INSERT INTO articles (categorie, nom, montant, localisation, image_url, description) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [categorie, nom, montant, localisation, image_url, description]
    );
    res.json(db.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE supprimer un article
app.delete("/articles/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM articles WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Routes API : Catégories ---------- */

// GET toutes les catégories
app.get("/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST ajouter une catégorie
app.post("/categories", async (req, res) => {
  try {
    const { slug, label } = req.body;
    if (!slug || !label) {
      return res.status(400).json({ error: "slug et label requis" });
    }
    const exist = await pool.query("SELECT * FROM categories WHERE slug=$1", [slug]);
    if (exist.rows.length > 0) {
      return res.status(409).json({ error: "Cette catégorie existe déjà." });
    }
    const db = await pool.query(
      "INSERT INTO categories (slug, label) VALUES ($1,$2) RETURNING *",
      [slug, label]
    );
    res.json(db.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE supprimer une catégorie
app.delete("/categories/:slug", async (req, res) => {
  try {
    await pool.query("DELETE FROM categories WHERE slug=$1", [req.params.slug]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Fallback SPA ---------- */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ---------- Start ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));