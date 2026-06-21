/* ---------- Config API ---------- */
const API = "";
const ADMIN_KEY = "md_boutique_admin_session";
const ADMIN_PASS = "mouhammad2026";
const WAVE_NUM = "773769951";

/* ---------- Catégories (gérées par le backend) ---------- */
function slugify(texte) {
  return texte.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

async function getCategories() {
  try {
    const res = await fetch(`${API}/categories`);
    if (!res.ok) throw new Error("Erreur chargement catégories");
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function ajouterCategorie(label) {
  const slug = slugify(label);
  if (!slug) return { ok: false, message: "Nom de catégorie invalide." };
  try {
    const res = await fetch(`${API}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, label: label.trim() })
    });
    if (res.status === 409) {
      return { ok: false, message: "Cette catégorie existe déjà." };
    }
    if (!res.ok) {
      return { ok: false, message: "Erreur serveur." };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: "Erreur réseau." };
  }
}

async function supprimerCategorie(slug) {
  try {
    await fetch(`${API}/categories/${encodeURIComponent(slug)}`, { method: "DELETE" });
  } catch (err) {
    console.error(err);
  }
}

/* ---------- Contenu dynamique de l'accueil ---------- */
async function getContenu() {
  try {
    const res = await fetch(`${API}/contenu`);
    if (!res.ok) throw new Error("Erreur chargement contenu");
    return await res.json();
  } catch (err) {
    console.error(err);
    return {};
  }
}

async function majContenu(updates) {
  try {
    const res = await fetch(`${API}/contenu`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    if (!res.ok) return { ok: false, message: "Erreur serveur." };
    return { ok: true };
  } catch (err) {
    return { ok: false, message: "Erreur réseau." };
  }
}

/* ---------- Menu de navigation ---------- */
async function renderNav(actif) {
  const navEl = document.getElementById("nav");
  if (!navEl) return;
  const cats = await getCategories();
  let html = `<a href="index.html"${actif === "accueil" ? ' class="active"' : ''}>Accueil</a>`;
  cats.forEach(c => {
    html += `<a href="categorie.html?cat=${encodeURIComponent(c.slug)}"${actif === c.slug ? ' class="active"' : ''}>${c.label}</a>`;
  });
  html += `<a href="admin.html"${actif === "admin" ? ' class="active"' : ''}>Admin</a>`;
  navEl.innerHTML = html;
}

/* ---------- Affichage public par catégorie (depuis l'API) ---------- */
async function renderCategorie(categorieSlug, containerId) {
  const el = document.getElementById(containerId);
  el.innerHTML = `<div class="empty">Chargement…</div>`;
  try {
    const res = await fetch(`${API}/articles/${encodeURIComponent(categorieSlug)}`);
    const items = await res.json();
    if (!items.length) {
      el.innerHTML = `<div class="empty">Aucun article pour le moment dans cette catégorie. Revenez bientôt.</div>`;
      return;
    }
    el.innerHTML = items.map(p => `
      <div class="card">
        <img src="${p.image_url || 'https://placehold.co/400x300/F2E8D5/0F3D3E?text=' + encodeURIComponent(p.nom)}" alt="${p.nom}">
        <div class="body">
          <h3>${p.nom}</h3>
          <div class="meta">${p.description ? p.description + '<br>' : ''}<b>Lieu :</b> ${p.localisation}</div>
          <div class="price">${p.montant} FCFA</div>
          <a class="btn small" href="wave.html?article=${encodeURIComponent(p.nom)}&montant=${encodeURIComponent(p.montant)}" target="_blank" rel="noopener">Commander via Wave</a>
        </div>
      </div>
    `).join("");
  } catch (err) {
    el.innerHTML = `<div class="empty">Erreur de chargement. Vérifiez votre connexion.</div>`;
  }
}

/* ---------- Cartes catégories sur la page d'accueil ---------- */
async function renderCategoriesAccueil(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="empty">Chargement…</div>`;
  const cats = await getCategories();
  if (!cats.length) {
    el.innerHTML = `<div class="empty">Aucune catégorie pour le moment.</div>`;
    return;
  }
  const couleurs = ["0F3D3E/F2E8D5", "C9602C/FBF8F2", "F2E8D5/0F3D3E", "0F3D3E/C9602C"];
  el.innerHTML = cats.map((c, i) => `
    <div class="card">
      <img src="https://placehold.co/400x300/${couleurs[i % couleurs.length]}?text=${encodeURIComponent(c.label)}" alt="${c.label}">
      <div class="body">
        <h3>${c.label}</h3>
        <div class="meta">Voir les modèles disponibles, prix et lieu de retrait.</div>
        <a class="btn small" href="categorie.html?cat=${encodeURIComponent(c.slug)}">Voir « ${c.label} »</a>
      </div>
    </div>
  `).join("");
}

/* ---------- Menu mobile ---------- */
function toggleMenu() {
  document.querySelector("nav").classList.toggle("open");
  document.querySelector(".burger").classList.toggle("open");
}
document.addEventListener("click", function (e) {
  const nav = document.querySelector("nav");
  const burger = document.querySelector(".burger");
  if (!nav || !burger) return;
  if (nav.classList.contains("open") && !nav.contains(e.target) && !burger.contains(e.target)) {
    nav.classList.remove("open");
    burger.classList.remove("open");
  }
});

/* ---------- Authentification admin ---------- */
function isAdminConnecte() {
  return sessionStorage.getItem(ADMIN_KEY) === "ok";
}
function connecterAdmin(pass) {
  if (pass === ADMIN_PASS) {
    sessionStorage.setItem(ADMIN_KEY, "ok");
    return true;
  }
  return false;
}
function deconnecterAdmin() {
  sessionStorage.removeItem(ADMIN_KEY);
}