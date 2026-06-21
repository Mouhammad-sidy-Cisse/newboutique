/* ---------- Config API ---------- */
const API = "";
const ADMIN_KEY = "md_boutique_admin_session";
const ADMIN_PASS = "mouhammad2026";
const WAVE_NUM = "773769951";

/* ---------- Catégories (locales, gérées par l'admin) ---------- */
const CAT_KEY = "md_boutique_categories";

function getCategories() {
  const raw = localStorage.getItem(CAT_KEY);
  if (raw) return JSON.parse(raw);
  const defaut = [
    { slug: "hidjab", label: "Hidjab" },
    { slug: "bonnet", label: "Bonnet" },
    { slug: "chaussure", label: "Chaussure" }
  ];
  localStorage.setItem(CAT_KEY, JSON.stringify(defaut));
  return defaut;
}
function saveCategories(list) {
  localStorage.setItem(CAT_KEY, JSON.stringify(list));
}
function slugify(texte) {
  return texte.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}
function ajouterCategorie(label) {
  const slug = slugify(label);
  if (!slug) return { ok: false, message: "Nom de catégorie invalide." };
  const cats = getCategories();
  if (cats.find(c => c.slug === slug)) return { ok: false, message: "Cette catégorie existe déjà." };
  cats.push({ slug, label: label.trim() });
  saveCategories(cats);
  return { ok: true };
}
function supprimerCategorie(slug) {
  saveCategories(getCategories().filter(c => c.slug !== slug));
}

/* ---------- Menu de navigation ---------- */
function renderNav(actif) {
  const navEl = document.getElementById("nav");
  if (!navEl) return;
  const cats = getCategories();
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
function renderCategoriesAccueil(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const cats = getCategories();
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
