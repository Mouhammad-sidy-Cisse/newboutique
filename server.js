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
async function initDB() {
  await pool.query(`
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
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  const count = await pool.query("SELECT COUNT(*) FROM categories");
  if (parseInt(count.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO categories (slug, label) VALUES
      ('hidjab', 'Hidjab'),
      ('bonnet', 'Bonnet'),
      ('chaussure', 'Chaussure')
    `);
  }
  console.log("Tables OK");
}
initDB().catch(err => console.error("Erreur DB:", err));

/* ---------- Routes catégories ---------- */

app.get("/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/categories", async (req, res) => {
  try {
    const { slug, label } = req.body;
    const result = await pool.query(
      "INSERT INTO categories (slug, label) VALUES ($1, $2) RETURNING *",
      [slug, label]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/categories/:slug", async (req, res) => {
  try {
    await pool.query("DELETE FROM categories WHERE slug=$1", [req.params.slug]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Routes articles ---------- */

app.get("/articles", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM articles ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.delete("/articles/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM articles WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Fallback ---------- */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ---------- Start ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));