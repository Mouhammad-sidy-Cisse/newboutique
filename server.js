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
  const check = await pool.query("SELECT COUNT(*) FROM categories");
  if (parseInt(check.rows[0].count) === 0) {
    await pool.query(
      "INSERT INTO categories (slug, label) VALUES ($1,$2),($3,$4),($5,$6)",
      ["hidjab", "Hidjab", "bonnet", "Bonnet", "chaussure", "Chaussure"]
    );
    console.log("Catégories par défaut insérées");
  }
}).catch(err => console.error("Erreur table categories:", err));

pool.query(`
  CREATE TABLE IF NOT EXISTS contenu (
    cle TEXT PRIMARY KEY,
    valeur TEXT NOT NULL
  )
`).then(async () => {
  console.log("Table contenu OK");
  const check = await pool.query("SELECT COUNT(*) FROM contenu");
  if (parseInt(check.rows[0].count) === 0) {
    await pool.query(
      "INSERT INTO contenu (cle, valeur) VALUES ($1,$2),($3,$4),($5,$6),($7,$8)",
      [
        "eyebrow", "Bienvenue chez Amina",
        "titre", "La boutique d'Amina, l'hidjabista.",
        "description", "Amina choisit et propose elle-même chaque hidjab, bonnet et paire de chaussures, avec le prix et le lieu de retrait clairement indiqués. Ce site a été développé par son grand frère Mouhammad, étudiant en deuxième année de Télécommunications et Réseaux Informatiques. Parcourez la boutique, choisissez votre article, et commandez directement via Wave.",
        "sous_titre_boutique", "Les catégories ci-dessous sont gérées par l'admin et peuvent évoluer à tout moment."
      ]
    );
    console.log("Contenu par défaut inséré");
  }
}).catch(err => console.error("Erreur table contenu:", err));

/* ---------- Routes API : Articles ---------- */

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

/* ---------- Routes API : Catégories ---------- */

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

app.delete("/categories/:slug", async (req, res) => {
  try {
    await pool.query("DELETE FROM categories WHERE slug=$1", [req.params.slug]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Routes API : Contenu accueil ---------- */

app.get("/contenu", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM contenu");
    const objet = {};
    result.rows.forEach(r => { objet[r.cle] = r.valeur; });
    res.json(objet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/contenu", async (req, res) => {
  try {
    const updates = req.body;
    const cles = Object.keys(updates);
    for (const cle of cles) {
      await pool.query(
        `INSERT INTO contenu (cle, valeur) VALUES ($1,$2)
         ON CONFLICT (cle) DO UPDATE SET valeur = $2`,
        [cle, updates[cle]]
      );
    }
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