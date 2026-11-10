// Relais de recherche par code-barres pour le catalogue de collection.
// Appelé par l'appli avec la session de Ghislain ; interroge les sources
// gratuites que le navigateur ne peut pas toujours joindre directement.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const UA = "CatalogueCollection/1.0 (usage personnel)";
const LIVRES = ["BD", "Manga", "Livre"];
const MUSIQUE = ["CD", "Vinyle"];
const JEUX = ["Jeu de société", "Jeu vidéo"];

type Candidat = Record<string, unknown> & { source: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

async function get(url: string, ms = 8000): Promise<Response | null> {
  try {
    return await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json, text/xml" }, signal: AbortSignal.timeout(ms) });
  } catch {
    return null;
  }
}

const annee = (s?: string | null) => {
  const m = (s || "").match(/(1[89]\d\d|20\d\d)/);
  return m ? Number(m[1]) : null;
};

// « Van Hamme, Jean (1939-....). Auteur du texte » -> « Jean Van Hamme »
function nomPersonne(s: string) {
  const base = s.replace(/\s*\(.*$/, "").replace(/\.\s*[A-ZÉ][^.]*$/, "").trim();
  const [nom, prenom] = base.split(",").map((x) => x.trim());
  return prenom ? `${prenom} ${nom}` : nom;
}

function decode(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

// ---------- Livres : Open Library ----------
async function openLibrary(isbn: string): Promise<Candidat | null> {
  const r = await get(`https://openlibrary.org/isbn/${isbn}.json`);
  if (!r || !r.ok) return null;
  const d = await r.json();
  const c: Candidat = { source: "Open Library" };
  // Série : champ "series" (« Thorgal (27) ») ou titre « Thorgal, tome 27 »
  const ser = (d.series || [])[0] as string | undefined;
  let m = ser?.match(/^(.*?)\s*\((\d+)\)\s*$/) || ser?.match(/^(.*?)[,;]\s*(?:tome|t\.|vol\.?|n°)\s*(\d+)/i);
  if (m) { c.serie = m[1].trim(); c.numero = m[2]; }
  const t: string = d.title || "";
  const mt = t.match(/^(.*?)[,.:\-–]\s*(?:tome|t\.|vol\.?|volume|n°)\s*(\d+)\s*[:.,\-–]?\s*(.*)$/i);
  if (mt) {
    c.serie ??= mt[1].trim();
    c.numero ??= mt[2];
    if (mt[3]) c.titre = mt[3].trim();
  } else if (!c.serie) {
    c.titre = t;
  }
  if (d.subtitle && (!c.titre || c.serie)) c.titre = d.subtitle;
  if (!c.titre && !c.serie) c.titre = t;
  c.editeur = (d.publishers || [])[0];
  c.annee_exemplaire = annee(d.publish_date);
  const fmt: Record<string, string> = { hardcover: "Relié", paperback: "Broché", "mass market paperback": "Poche", "pocket book": "Poche" };
  if (d.physical_format && fmt[String(d.physical_format).toLowerCase()]) c.format = fmt[String(d.physical_format).toLowerCase()];
  if ((d.covers || []).length && d.covers[0] > 0) c.couverture_url = `https://covers.openlibrary.org/b/id/${d.covers[0]}-L.jpg`;
  // Auteurs (deux appels au plus)
  const noms: string[] = [];
  for (const a of (d.authors || []).slice(0, 2)) {
    const ra = await get(`https://openlibrary.org${a.key}.json`, 4000);
    if (ra?.ok) { const ja = await ra.json(); if (ja.name) noms.push(ja.name); }
  }
  if (noms[0]) c.auteur = noms[0];
  if (noms[1]) c.dessinateur = noms[1];
  return c;
}

// ---------- Livres : BnF (catalogue général, Dublin Core) ----------
async function bnf(isbn: string): Promise<Candidat | null> {
  const q = encodeURIComponent(`bib.isbn adj "${isbn}"`);
  const r = await get(`https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=${q}&recordSchema=dublincore&maximumRecords=1`);
  if (!r || !r.ok) return null;
  const x = await r.text();
  if (!/<srw:numberOfRecords>[1-9]/.test(x)) return null;
  const tous = (tag: string) => [...x.matchAll(new RegExp(`<dc:${tag}[^>]*>([\\s\\S]*?)</dc:${tag}>`, "g"))].map((m) => decode(m[1].trim()));
  const c: Candidat = { source: "BnF" };
  const titre = (tous("title")[0] || "").split(" / ")[0].trim();
  // « Kriss de Valnor. Tome 7, La montagne du temps »
  const m = titre.match(/^(.*?)\.\s*(?:Tome|Vol\.?|Volume|T\.|N°)\s*(\d+)\s*(?:,\s*(.*))?$/i);
  if (m) { c.serie = m[1].trim(); c.numero = m[2]; if (m[3]) c.titre = m[3].trim(); } else c.titre = titre;
  const personnes = [...tous("creator"), ...tous("contributor")];
  const scen = personnes.filter((p) => /Auteur du texte|Scénariste|Auteur$/i.test(p)).map(nomPersonne);
  const dess = personnes.filter((p) => /Illustrateur|Dessinateur/i.test(p)).map(nomPersonne);
  if (scen.length) c.auteur = scen.join(", ");
  if (dess.length) c.dessinateur = dess.join(", ");
  if (!scen.length && personnes.length) c.auteur = nomPersonne(personnes[0]);
  const ed = tous("publisher")[0];
  if (ed) {
    const e = ed.replace(/\s*\(.*\)\s*$/, "").trim();
    c.editeur = e.charAt(0).toUpperCase() + e.slice(1);
  }
  c.annee_exemplaire = annee(tous("date")[0]);
  return c;
}

function fusionLivre(ol: Candidat | null, b: Candidat | null): Candidat | null {
  if (!ol && !b) return null;
  // BnF prioritaire sur les champs texte (titre d'album, auteurs), Open Library pour la couverture.
  const c: Candidat = { ...(ol || {}), ...(b || {}), source: [ol && "Open Library", b && "BnF"].filter(Boolean).join(" + ") };
  if (ol?.couverture_url) c.couverture_url = ol.couverture_url;
  for (const k of ["serie", "numero", "titre", "auteur", "dessinateur", "editeur", "annee_exemplaire"]) {
    if (c[k] == null || c[k] === "") c[k] = (ol || {})[k] ?? (b || {})[k];
  }
  return c;
}

// ---------- Musique : MusicBrainz + Cover Art Archive ----------
async function musicBrainz(code: string): Promise<Candidat[]> {
  const r = await get(`https://musicbrainz.org/ws/2/release?query=barcode:${code}&fmt=json&limit=12`);
  if (!r || !r.ok) return [];
  const d = await r.json();
  const out: Candidat[] = [];
  for (const rel of d.releases || []) {
    if (rel.barcode && rel.barcode.replace(/^0+/, "") !== code.replace(/^0+/, "")) continue;
    const formats = (rel.media || []).map((m: { format?: string }) => m.format).filter(Boolean);
    out.push({
      source: "MusicBrainz",
      auteur: (rel["artist-credit"] || []).map((a: { name: string; joinphrase?: string }) => a.name + (a.joinphrase || "")).join("").trim(),
      titre: rel.title,
      editeur: rel["label-info"]?.[0]?.label?.name,
      annee: annee(rel["release-group"]?.["first-release-date"]) ?? annee(rel.date),
      annee_exemplaire: annee(rel.date),
      format: [...new Set(formats)].join(", "),
      pays: rel.country,
      statut_edition: rel.status,
      precision: [rel.country, rel.date, formats.join("+"), rel.status !== "Official" ? rel.status : null, rel.disambiguation].filter(Boolean).join(" · "),
      couverture_url: `https://coverartarchive.org/release/${rel.id}/front-500`,
      mbid: rel.id,
    });
  }
  // Éditions officielles d'abord
  out.sort((a, b) => Number(b.statut_edition === "Official") - Number(a.statut_edition === "Official"));
  return out;
}

// ---------- Jeux : UPCitemdb (offre d'essai) ----------
function nettoieTitre(t: string) {
  return t
    .replace(/\b(free\s*(p\s*&\s*p|delivery|shipping|post)(\s*uk)?|brand\s*new(\s*(&|and)\s*sealed)?|new\s*(&|and)\s*sealed|factory\s*sealed|brand\s*sealed|sealed|uk seller|fast dispatch|pal|nib|bnib)\b/gi, "")
    .replace(/\s*[&+]\s*(?=[-–|,]|$)/g, "")
    .replace(/\s*[-–|,]\s*(?=[-–|,]|$)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–|,]+|[\s\-–|,]+$/g, "")
    .trim();
}
async function upcItemDb(code: string): Promise<Candidat[]> {
  const r = await get(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`);
  if (!r || !r.ok) return [];
  const d = await r.json();
  return (d.items || []).slice(0, 3).map((it: { title?: string; brand?: string; images?: string[] }) => ({
    source: "UPCitemdb",
    titre: nettoieTitre(it.title || ""),
    editeur: it.brand || undefined,
    couverture_url: (it.images || [])[0],
    precision: "Titre brut d'annonce marchande, à vérifier",
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // Réservé au propriétaire : la règle d'accès de la base ne renvoie des lignes qu'à lui.
  const auth = req.headers.get("Authorization") || "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: ok } = await sb.from("series").select("id").limit(1);
  if (!ok || !ok.length) return json({ erreur: "Accès refusé" }, 403);

  let corps: { code?: string; categorie?: string } = {};
  try { corps = await req.json(); } catch { /* vide */ }
  const code = String(corps.code || "").replace(/[^0-9X]/gi, "").toUpperCase();
  const cat = corps.categorie || "";
  if (code.length < 8) return json({ erreur: "Code-barres trop court" }, 400);

  const estLivre = LIVRES.includes(cat) || (!cat && /^97[89]/.test(code));
  const candidats: Candidat[] = [];
  const interrogees: string[] = [];

  if (estLivre) {
    interrogees.push("Open Library", "BnF");
    const [ol, b] = await Promise.all([openLibrary(code), bnf(code)]);
    const f = fusionLivre(ol, b);
    if (f) candidats.push(f);
  } else if (MUSIQUE.includes(cat)) {
    interrogees.push("MusicBrainz");
    candidats.push(...await musicBrainz(code));
  } else if (JEUX.includes(cat)) {
    interrogees.push("UPCitemdb");
    candidats.push(...await upcItemDb(code));
  } else {
    interrogees.push("MusicBrainz", "UPCitemdb");
    const [m, u] = await Promise.all([musicBrainz(code), upcItemDb(code)]);
    candidats.push(...m, ...u);
  }
  return json({ code, sources: interrogees, candidats });
});
