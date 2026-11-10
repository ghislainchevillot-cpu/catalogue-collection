/* Catalogue de collection — application web personnelle.
   Maintenance : Claude. Données : Supabase (tables series, objets ; stockage photos). */
(function () {
  'use strict';

  const sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
  });

  // ------------------------------------------------------------------
  // Catégories et champs (libellés propres à chaque catégorie)
  // [colonne, libellé, type, aide]  type : txt (défaut), int, code, bool, serie, extension, liste:a|b
  // ------------------------------------------------------------------
  const ETATS = ['Neuf', 'Bon', 'Abîmé'];
  const CATS = [
    { id: 'BD', slug: 'bd', nom: 'BD', series: true, scan: 'livre', couv: 'livre', champs: [
      ['serie', 'Série', 'serie'], ['cycle', 'Cycle', 'txt', 'facultatif'], ['numero', 'Tome'], ['titre', "Titre de l'album"],
      ['auteur', 'Scénario'], ['dessinateur', 'Dessin'], ['editeur', 'Éditeur'], ['annee', 'Année de parution', 'int'],
      ['annee_exemplaire', "Année de l'exemplaire", 'int'], ['code_barres', 'Code-barres', 'code'], ['variante', 'Variante', 'txt', 'ex. édition originale, intégrale'] ] },
    { id: 'Manga', slug: 'mangas', nom: 'Mangas', series: true, scan: 'livre', couv: 'livre', champs: [
      ['serie', 'Série', 'serie'], ['numero', 'Tome'], ['auteur', 'Auteur'], ['editeur', 'Éditeur'], ['annee', 'Année de parution', 'int'],
      ['code_barres', 'Code-barres', 'code'], ['variante', 'Variante', 'txt', 'ex. édition collector'] ] },
    { id: 'Livre', slug: 'livres', nom: 'Livres', series: true, serieFacultative: true, scan: 'livre', couv: 'livre', champs: [
      ['titre', 'Titre du livre'], ['auteur', 'Auteur'], ['serie', 'Série (facultatif)', 'serie'], ['numero', 'Tome (facultatif)'],
      ['editeur', 'Éditeur'], ['format', 'Format', 'txt', 'Poche, broché, relié'], ['annee', 'Année de parution', 'int'],
      ['code_barres', 'Code-barres', 'code'], ['variante', 'Variante'] ] },
    { id: 'Jeu de société', slug: 'jeux-societe', nom: 'Jeux de société', scan: 'jeu', couv: 'carre', champs: [
      ['titre', 'Nom du jeu'], ['variante', 'Édition ou version', 'txt', 'ex. Star Wars, XXL'], ['editeur', 'Éditeur'], ['annee', 'Année', 'int'],
      ['extension_de', "Extension de quel jeu", 'extension'], ['complet', 'Complet (pièces, règle)', 'bool'], ['code_barres', 'Code-barres', 'code'] ] },
    { id: 'Jeu vidéo', slug: 'jeux-video', nom: 'Jeux vidéo', scan: 'jeu', couv: 'livre', champs: [
      ['titre', 'Titre du jeu'], ['plateforme', 'Plateforme', 'txt', 'ex. PlayStation 2'], ['variante', 'Édition', 'txt', 'ex. standard, collector'],
      ['editeur', 'Éditeur'], ['annee', 'Année de sortie', 'int'], ['complet', 'Complet (boîte, notice)', 'bool'], ['code_barres', 'Code-barres', 'code'] ] },
    { id: 'Console', slug: 'consoles', nom: 'Consoles', couv: 'carre', champs: [
      ['titre', 'Modèle', 'txt', 'ex. Super Nintendo'], ['editeur', 'Fabricant', 'txt', 'ex. Nintendo'], ['annee', 'Année de sortie', 'int'],
      ['accessoires', 'Accessoires fournis', 'txt', 'ex. 2 manettes, câbles, carte mémoire'], ['boite_origine', "Boîte d'origine", 'bool'],
      ['fonctionne', 'Fonctionne', 'bool'], ['variante', 'Variante', 'txt', 'ex. coloris, édition limitée'] ] },
    { id: 'CD', slug: 'cd', nom: 'CD', scan: 'musique', couv: 'carre', champs: [
      ['auteur', 'Artiste'], ['titre', 'Album'], ['editeur', 'Label'], ['annee', 'Année', 'int'], ['code_barres', 'Code-barres', 'code'],
      ['variante', 'Variante', 'txt', 'ex. remasterisé, édition deluxe'] ] },
    { id: 'Vinyle', slug: 'vinyles', nom: 'Vinyles', scan: 'musique', couv: 'carre', etatLabel: 'État (disque et pochette)', champs: [
      ['auteur', 'Artiste'], ['titre', 'Album'], ['editeur', 'Label'], ['format', 'Format', 'txt', '33 tours, 45 tours, maxi'],
      ['annee', 'Année du pressage', 'int'], ['code_barres', 'Code-barres', 'code'], ['variante', 'Variante', 'txt', 'ex. vinyle couleur, réédition'] ] },
    { id: 'Figurine', slug: 'figurines', nom: 'Figurines', couv: 'livre', champs: [
      ['titre', 'Personnage ou modèle'], ['editeur', 'Marque'], ['gamme', 'Gamme ou licence'], ['annee', 'Année', 'int'],
      ['boite_origine', "Boîte d'origine", 'bool'], ['variante', 'Variante'] ] },
    { id: 'Pièce', slug: 'pieces', nom: 'Pièces', couv: 'carre', etats: ['B', 'TB', 'TTB', 'SUP', 'SPL', 'FDC'], etatLabel: 'État (ton estimation)', champs: [
      ['pays', 'Pays'], ['valeur_faciale', 'Valeur faciale', 'txt', 'ex. 10 francs'], ['annee', 'Millésime', 'int'], ['metal', 'Métal'],
      ['atelier', 'Atelier'], ['variante', 'Type de frappe', 'txt', 'ex. Belle Épreuve, BU'] ] },
    { id: 'Timbre', slug: 'timbres', nom: 'Timbres', couv: 'carre', etats: ['TB', 'B', 'Défectueux'], champs: [
      ['pays', 'Pays'], ['valeur_faciale', 'Valeur faciale'], ['annee', "Année d'émission", 'int'], ['titre', 'Sujet représenté'],
      ['conservation', 'Conservation', 'liste:Neuf **|Neuf *|Neuf sans gomme|Oblitéré'],
      ['variante', 'Présentation', 'txt', 'détaché, bloc, carnet, enveloppe premier jour…'] ] },
  ];
  const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));
  const CAT_SLUG = Object.fromEntries(CATS.map((c) => [c.slug, c]));
  const etatsDe = (cat) => (CAT[cat] && CAT[cat].etats) || ETATS;

  // ------------------------------------------------------------------
  // État de l'appli
  // ------------------------------------------------------------------
  const S = { session: null, objets: [], series: [], urls: new Map(), pret: false, form: null, retourScan: null };
  const parId = (id) => S.objets.find((o) => o.id === id);
  const serieDe = (id) => S.series.find((s) => s.id === id);
  const main = document.getElementById('main');
  const nav = document.getElementById('nav');

  // ------------------------------------------------------------------
  // Outils
  // ------------------------------------------------------------------
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const vide = (v) => v == null || String(v).trim() === '';
  // Même normalisation que cle_texte() côté base : minuscules, sans accents, sans article initial, alphanumérique seul.
  function cle(t) {
    let s = String(t == null ? '' : t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    s = s.replace(/^\s*(le |la |les |l'|l’|the |un |une )/, '');
    return s.replace(/[^a-z0-9]+/g, '');
  }
  const numTri = (o) => (o.ordre != null ? Number(o.ordre) : (parseFloat(o.numero) || 9999));
  const PALETTE = ['#2B5A87', '#8A6A1F', '#9A3B34', '#3C6E4F', '#6A4C93', '#1F6F78', '#8C4A2F', '#4A5A8C', '#7A3E5D', '#5B6B2E'];
  function couleur(t) { let h = 0; for (const c of String(t || '?')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; }
  let toastT;
  function toast(msg, ms = 2800) {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('visible');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('visible'), ms);
  }
  function erreur(e, quoi) {
    console.error(e);
    const m = (e && (e.message || e.error_description)) || String(e);
    toast((quoi ? quoi + ' : ' : '') + traduitErreur(m), 6000);
  }
  function traduitErreur(m) {
    if (/etat_echelle/.test(m)) return "état incompatible avec la catégorie";
    if (/manquant_dans_serie/.test(m)) return 'le statut Manquant demande une série';
    if (/etat_si_possede/.test(m)) return "l'état ne s'indique que pour un objet possédé";
    if (/code_barres_check/.test(m)) return 'le code-barres ne doit contenir que des chiffres';
    if (/annee/.test(m) && /check/.test(m)) return 'année hors limites (1800 à 2100)';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'pas de réseau';
    return m;
  }
  function chargerScript(src, global) {
    if (window[global]) return Promise.resolve(window[global]);
    return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = () => ok(window[global]); s.onerror = ko; document.head.appendChild(s); });
  }

  // Libellés d'objet
  function nomSerie(o) { const s = o.serie_id && serieDe(o.serie_id); return s ? s.nom : ''; }
  function titreObjet(o) {
    switch (o.categorie) {
      case 'CD': case 'Vinyle': return o.titre || '(album sans titre)';
      case 'Pièce': return [o.valeur_faciale, o.pays].filter(Boolean).join(' · ') || 'Pièce';
      case 'Timbre': return o.titre || [o.valeur_faciale, o.pays].filter(Boolean).join(' · ') || 'Timbre';
      default:
        if (o.serie_id) return o.titre || (nomSerie(o) + (o.numero ? ' — tome ' + o.numero : ''));
        return o.titre || '(sans titre)';
    }
  }
  function sousTitre(o) {
    const p = [];
    if (o.serie_id) p.push(nomSerie(o) + (o.cycle ? ' · ' + o.cycle : '') + (o.numero ? ' · tome ' + o.numero : ''));
    if (o.categorie === 'CD' || o.categorie === 'Vinyle') p.push(o.auteur);
    if (o.categorie === 'Jeu vidéo') p.push(o.plateforme);
    if (o.categorie === 'Pièce' || o.categorie === 'Timbre') p.push(o.annee);
    if (!o.serie_id && o.categorie === 'Livre') p.push(o.auteur);
    if (o.variante) p.push(o.variante);
    return p.filter(Boolean).join(' · ');
  }
  function libelleCourt(o) {
    if (o.serie_id) return nomSerie(o) + (o.numero ? ' T' + o.numero : '') + (o.titre ? ' — ' + o.titre : '');
    if (o.categorie === 'CD' || o.categorie === 'Vinyle') return (o.auteur ? o.auteur + ' — ' : '') + (o.titre || '');
    return titreObjet(o) + (o.variante ? ' (' + o.variante + ')' : '');
  }
  function image(o) { return (o.photo_path && S.urls.get(o.photo_path)) || o.couverture_url || ''; }

  function couverture(o, opts = {}) {
    const c = CAT[o.categorie] || {};
    const manq = o.statut === 'Manquant';
    const fond = couleur(nomSerie(o) || o.titre || o.categorie);
    const src = image(o);
    const num = o.numero || (o.categorie === 'Pièce' || o.categorie === 'Timbre' ? (o.annee || '') : '');
    const badge = opts.badge && o.statut !== 'Possédé' ? `<span class="badge b-${esc(o.statut)}">${esc(o.statut)}</span>` : '';
    return `<span class="couv ${c.couv === 'carre' ? 'carre' : ''} ${manq ? 'manquant' : ''}" style="background:${fond}">
      ${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}${badge}
      <span class="haut">${esc(nomSerie(o) || (o.categorie === 'CD' || o.categorie === 'Vinyle' ? o.auteur : o.plateforme || o.editeur || o.pays) || c.nom || '')}</span>
      <span class="num">${esc(num)}</span>
      <span class="bas">${esc(manq ? 'Manquant' : (src ? '' : (o.titre || '').slice(0, 40)))}</span></span>`;
  }
  function tuile(o, opts) {
    const t = o.serie_id ? (o.titre || 'Tome ' + (o.numero || '?')) : titreObjet(o) + (o.variante ? ' · ' + o.variante : '');
    return `<a class="tuile" href="#/o/${o.id}">${couverture(o, opts)}<span class="titre">${esc(t)}</span></a>`;
  }
  function ligneObjet(o, droite = '') {
    const src = image(o);
    return `<a class="ligne-objet" href="#/o/${o.id}">
      <span class="mini" style="background:${couleur(nomSerie(o) || o.titre)}">${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : esc((o.numero || (o.titre || '?').charAt(0)))}</span>
      <span class="txt"><b>${esc(titreObjet(o))}</b><span>${esc([CAT[o.categorie] && CAT[o.categorie].nom, sousTitre(o)].filter(Boolean).join(' · '))}</span></span>${droite}</a>`;
  }

  // Lien vers le site de cote (stocké ou proposé par défaut)
  function lienCote(o) {
    if (o.lien_cote) return { url: o.lien_cote, nom: 'le site de référence' };
    const q = (...p) => encodeURIComponent(p.filter(Boolean).join(' '));
    switch (o.categorie) {
      case 'BD': case 'Manga':
        return { url: 'https://www.bedetheque.com/search/tout?RechTexte=' + q(nomSerie(o) || o.titre) + '&RechWhere=0', nom: 'Bedetheque' };
      case 'Livre': return o.code_barres ? { url: 'https://www.abebooks.fr/servlet/SearchResults?isbn=' + o.code_barres, nom: 'AbeBooks' } : { url: 'https://www.abebooks.fr/servlet/SearchResults?kn=' + q(o.titre, o.auteur), nom: 'AbeBooks' };
      case 'CD': case 'Vinyle': return { url: 'https://www.discogs.com/search/?q=' + (o.code_barres || q(o.auteur, o.titre)) + '&type=all', nom: 'Discogs' };
      case 'Pièce': return { url: 'https://fr.numista.com/catalogue/index.php?r=' + q(o.pays, o.valeur_faciale, o.annee) + '&ct=coin', nom: 'Numista' };
      case 'Timbre': return { url: 'https://colnect.com/fr/stamps/list/q/' + q(o.pays, o.titre || o.valeur_faciale, o.annee), nom: 'Colnect' };
      case 'Jeu de société': return { url: 'https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q=' + q(o.titre), nom: 'BoardGameGeek' };
      default: return { url: 'https://www.ebay.fr/sch/i.html?LH_Sold=1&LH_Complete=1&_nkw=' + q(o.titre, o.plateforme, o.variante), nom: 'eBay (ventes conclues)' };
    }
  }

  // ------------------------------------------------------------------
  // Doublons (même règle que la vue v_doublons de la base)
  // ------------------------------------------------------------------
  function cleObjet(o, nomS, sansCycle) {
    const s = nomS !== undefined ? nomS : nomSerie(o);
    return cle([s, sansCycle ? '' : o.cycle, o.numero, o.titre].filter((x) => !vide(x)).join('#'));
  }
  // Renvoie { doublons: [objets], variantes: [objets], codes: [objets] } pour un objet (existant ou en cours de saisie).
  // Un objet saisi sans cycle est comparé aux autres en ignorant leur cycle (cas des ajouts par scan ou import).
  function chercheDoublons(o, nomS, exclure = []) {
    const sc = vide(o.cycle);
    const k = cleObjet(o, nomS, sc), kv = cle(o.variante);
    const r = { doublons: [], variantes: [], codes: [] };
    for (const x of S.objets) {
      if (exclure.includes(x.id)) continue;
      if (o.code_barres && x.code_barres === o.code_barres) r.codes.push(x);
      if (!k || x.categorie !== o.categorie || cleObjet(x, undefined, sc) !== k) continue;
      (cle(x.variante) === kv ? r.doublons : r.variantes).push(x);
    }
    r.codes = r.codes.filter((x) => !r.doublons.includes(x));
    return r;
  }
  function tousDoublons() {
    const paires = [];
    const groupes = new Map();
    for (const o of S.objets) {
      const k = cleObjet(o); if (!k) continue;
      const g = o.categorie + '|' + k + '|' + cle(o.variante);
      (groupes.get(g) || groupes.set(g, []).get(g)).push(o);
    }
    for (const g of groupes.values()) if (g.length > 1) paires.push({ type: 'Doublon', objets: g });
    const codes = new Map();
    for (const o of S.objets) if (o.code_barres) (codes.get(o.code_barres) || codes.set(o.code_barres, []).get(o.code_barres)).push(o);
    for (const g of codes.values()) if (g.length > 1 && !paires.some((p) => g.every((x) => p.objets.includes(x)))) paires.push({ type: 'Même code-barres', objets: g });
    return paires;
  }

  // ------------------------------------------------------------------
  // Données
  // ------------------------------------------------------------------
  async function charger() {
    const objets = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await sb.from('objets').select('*').range(de, de + 999);
      if (error) throw error;
      objets.push(...data);
      if (data.length < 1000) break;
    }
    const { data: series, error } = await sb.from('series').select('*').order('nom');
    if (error) throw error;
    S.objets = objets; S.series = series;
    await signerPhotos(objets.map((o) => o.photo_path).filter(Boolean));
    S.pret = true;
  }
  async function signerPhotos(chemins) {
    const manquants = chemins.filter((p) => !S.urls.has(p));
    if (!manquants.length) return;
    const { data, error } = await sb.storage.from('photos').createSignedUrls(manquants, 60 * 60 * 24 * 7);
    if (error) { console.warn(error); return; }
    for (const d of data || []) if (d.signedUrl) S.urls.set(d.path, d.signedUrl);
  }
  async function trouverOuCreerSerie(categorie, nom) {
    nom = String(nom || '').trim(); if (!nom) return null;
    const k = cle(nom);
    const ex = S.series.find((s) => s.categorie === categorie && cle(s.nom) === k);
    if (ex) return ex;
    const { data, error } = await sb.from('series').insert({ categorie, nom }).select().single();
    if (error) throw error;
    S.series.push(data); S.series.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    return data;
  }
  async function majObjet(id, patch) {
    const { data, error } = await sb.from('objets').update(patch).eq('id', id).select().single();
    if (error) throw error;
    const i = S.objets.findIndex((o) => o.id === id); if (i >= 0) S.objets[i] = data; else S.objets.push(data);
    return data;
  }
  async function compresser(fichier) {
    const url = URL.createObjectURL(fichier);
    try {
      const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
      const max = 1600, r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * r); cv.height = Math.round(img.naturalHeight * r);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      return await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.85));
    } catch (e) {
      if (fichier.size <= 5 * 1024 * 1024) return fichier; // format non lisible ici : envoi tel quel
      throw new Error('photo illisible ou trop lourde');
    } finally { URL.revokeObjectURL(url); }
  }
  async function enregistrerPhoto(objet, fichier) {
    const blob = await compresser(fichier);
    const chemin = `${objet.id}/${Date.now()}.jpg`;
    const { error } = await sb.storage.from('photos').upload(chemin, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
    if (error) throw error;
    const ancien = objet.photo_path;
    const maj = await majObjet(objet.id, { photo_path: chemin });
    await signerPhotos([chemin]);
    if (ancien) sb.storage.from('photos').remove([ancien]);
    return maj;
  }

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------
  function dessinerNav(actif) {
    const l = (h, t, k, cls = '') => `<a href="${h}" class="${cls} ${actif === k ? 'actif' : ''}" ${actif === k ? 'aria-current="page"' : ''}>${t}</a>`;
    nav.innerHTML = `<span class="marque">Ma collection</span>
      ${l('#/', 'Collection', 'collection')}${l('#/envies', 'Envies', 'envies')}${l('#/ajouter', 'Ajouter', 'ajouter')}
      <span class="sep pc"></span>${l('#/import', 'Ajout en masse', 'import', 'pc')}${l('#/doublons', 'Doublons', 'doublons', 'pc')}${l('#/reglages', 'Réglages', 'reglages', 'pc')}`;
  }
  function route() {
    const h = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
    const [chemin, qs] = h.split('?');
    const p = chemin.split('/').filter(Boolean);
    const q = new URLSearchParams(qs || '');
    return { p, q };
  }
  let dernierHash = '';
  async function afficher() {
    // Le lien e-mail de connexion arrive avec un jeton dans l'adresse : supabase-js le traite, on n'affiche rien d'autre.
    if (/access_token=|error_description=/.test(location.hash)) return;
    if (!S.session) return ecranConnexion();
    if (!S.pret) {
      main.innerHTML = '<div class="chargement">Chargement de la collection…</div>';
      try { S.chargement = S.chargement || charger(); await S.chargement; } catch (e) { S.chargement = null; main.innerHTML = `<div class="alerte rouge">Impossible de charger la collection : ${esc(traduitErreur(e.message || String(e)))}. <a href="#/" onclick="location.reload()">Réessayer</a></div>`; return; }
      if (!S.objets.length && !S.series.length) return ecranSansAcces();
    }
    if (S.scanActif) fermerScanner();
    const { p, q } = route();
    const meme = location.hash === dernierHash; dernierHash = location.hash;
    const y = window.scrollY;
    let actif = 'collection';
    try {
      if (!p.length) ecranAccueil(q);
      else if (p[0] === 'c' && CAT_SLUG[p[1]]) ecranCategorie(CAT_SLUG[p[1]], q);
      else if (p[0] === 's' && serieDe(p[1])) ecranSerie(serieDe(p[1]), q);
      else if (p[0] === 'o' && parId(p[1]) && p[2] === 'modifier') ecranFormulaire({ objet: parId(p[1]) });
      else if (p[0] === 'o' && parId(p[1])) ecranFiche(parId(p[1]));
      else if (p[0] === 'envies') { actif = 'envies'; ecranEnvies(); }
      else if (p[0] === 'ajouter') { actif = 'ajouter'; ecranFormulaire({ cat: CAT_SLUG[q.get('cat')] && CAT_SLUG[q.get('cat')].id, serieId: q.get('serie'), statut: q.get('statut') }); }
      else if (p[0] === 'doublons') { actif = 'doublons'; ecranDoublons(); }
      else if (p[0] === 'import') { actif = 'import'; ecranImport(); }
      else if (p[0] === 'reglages') { actif = 'reglages'; ecranReglages(); }
      else { location.hash = '#/'; return; }
    } catch (e) { erreur(e); }
    dessinerNav(actif);
    if (meme) window.scrollTo(0, y); else window.scrollTo(0, 0);
  }
  const rafraichir = () => { dernierHash = location.hash; afficher(); };
  window.addEventListener('hashchange', afficher);

  // ------------------------------------------------------------------
  // Connexion
  // ------------------------------------------------------------------
  function ecranConnexion() {
    nav.innerHTML = '';
    const memo = localStorage.getItem('email') || '';
    main.innerHTML = `<div class="connexion">
      <h1>Ma collection</h1>
      <p class="aide">Connexion sans mot de passe : un e-mail te sera envoyé.</p>
      <form id="f-mail" class="form">
        <div class="champ"><label for="email">Adresse e-mail</label><input id="email" type="email" autocomplete="email" required value="${esc(memo)}"></div>
        <button class="btn" type="submit">Recevoir le lien de connexion</button>
      </form>
      <button class="btn-texte" type="button" id="avec-mdp">Se connecter avec un mot de passe</button>
      <form id="f-mdp" class="form" hidden>
        <div class="champ"><label for="mdp">Mot de passe</label><input id="mdp" type="password" autocomplete="current-password"></div>
        <button class="btn" type="submit">Se connecter</button>
        <p class="aide">Le mot de passe se définit dans Réglages, après une première connexion par lien e-mail.</p>
      </form>
      <form id="f-code" class="form" hidden>
        <div class="alerte info">E-mail envoyé (expéditeur Supabase, vérifie les indésirables). Ouvre le lien qu'il contient <b>sur cet appareil</b>. S'il contient un code à chiffres, saisis-le ici.</div>
        <div class="champ"><label for="code">Code reçu par e-mail</label><input id="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*"></div>
        <button class="btn" type="submit">Valider le code</button>
        <button class="btn-texte" type="button" id="renvoyer">Changer d'adresse ou renvoyer</button>
      </form></div>`;
    const fm = document.getElementById('f-mail'), fc = document.getElementById('f-code');
    fm.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim().toLowerCase();
      localStorage.setItem('email', email);
      const b = fm.querySelector('button'); b.disabled = true;
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
      b.disabled = false;
      if (error) return erreur(error, 'Envoi impossible');
      fm.hidden = true; fc.hidden = false; document.getElementById('code').focus();
    };
    fc.onsubmit = async (e) => {
      e.preventDefault();
      const token = document.getElementById('code').value.replace(/\D/g, '');
      const { error } = await sb.auth.verifyOtp({ email: localStorage.getItem('email'), token, type: 'email' });
      if (error) erreur(error, 'Code refusé');
    };
    document.getElementById('renvoyer').onclick = () => { fc.hidden = true; fm.hidden = false; };
    const fp = document.getElementById('f-mdp');
    document.getElementById('avec-mdp').onclick = () => { fp.hidden = !fp.hidden; if (!fp.hidden) document.getElementById('mdp').focus(); };
    fp.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim().toLowerCase();
      if (!email) return toast('Saisis d\'abord ton adresse e-mail');
      localStorage.setItem('email', email);
      const { error } = await sb.auth.signInWithPassword({ email, password: document.getElementById('mdp').value });
      if (error) erreur(/invalid/i.test(error.message) ? new Error('adresse ou mot de passe incorrect') : error, 'Connexion refusée');
    };
  }
  function ecranSansAcces() {
    nav.innerHTML = '';
    main.innerHTML = `<div class="connexion"><h1>Accès refusé</h1><p class="aide">Ce compte (${esc(S.session.user.email)}) n'a pas accès à la collection.</p><button class="btn second" id="deco">Se déconnecter</button></div>`;
    document.getElementById('deco').onclick = () => sb.auth.signOut();
  }

  // ------------------------------------------------------------------
  // Accueil
  // ------------------------------------------------------------------
  function ecranAccueil(q) {
    const nb = (st) => S.objets.filter((o) => o.statut === st).length;
    const dbl = tousDoublons().length;
    const cats = CATS.map((c) => {
      const l = S.objets.filter((o) => o.categorie === c.id);
      const pos = l.filter((o) => o.statut === 'Possédé').length, env = l.filter((o) => o.statut === 'Envie').length;
      const ns = S.series.filter((s) => s.categorie === c.id).length;
      const det = l.length ? [pos + ' possédé' + (pos > 1 ? 's' : ''), env ? env + ' envie' + (env > 1 ? 's' : '') : '', ns ? ns + ' série' + (ns > 1 ? 's' : '') : ''].filter(Boolean).join(' · ') : 'À saisir';
      return `<a class="cat" href="#/c/${c.slug}"><b>${esc(c.nom)}</b><span>${esc(det)}</span></a>`;
    }).join('');
    const recherche = q.get('q') || '';
    main.innerHTML = `
      <div class="entete"><h1>Ma collection</h1><a class="icone-btn" href="#/reglages" aria-label="Réglages">⋯</a></div>
      <div class="champ"><label for="rech">Rechercher dans toute la collection</label>
        <input id="rech" class="recherche" type="search" placeholder="Titre, série, auteur, code-barres" value="${esc(recherche)}" autocomplete="off"></div>
      <div id="resultats"></div>
      <div id="accueil-corps">
        <div class="stats">
          <div class="stat"><b style="color:var(--vert)">${nb('Possédé')}</b><span>Possédés</span></div>
          <a class="stat" href="#/envies"><b style="color:var(--bleu)">${nb('Envie')}</b><span>Envies</span></a>
        </div>
        <p class="aide">${nb('Manquant')} tomes manquants dans tes séries, visibles dans chaque série.${dbl ? ` · <a href="#/doublons">${dbl} doublon${dbl > 1 ? 's' : ''} à vérifier</a>` : ''}</p>
        <h2>Catégories</h2><div class="cats">${cats}</div>
      </div>`;
    const champ = document.getElementById('rech');
    const lancer = () => {
      const v = champ.value.trim();
      history.replaceState(null, '', v ? '#/?q=' + encodeURIComponent(v) : '#/'); dernierHash = location.hash;
      document.getElementById('accueil-corps').hidden = !!v;
      document.getElementById('resultats').innerHTML = v ? resultatsRecherche(v) : '';
    };
    champ.addEventListener('input', lancer);
    if (recherche) lancer();
  }
  function resultatsRecherche(v) {
    const mots = v.split(/\s+/).map(cle).filter(Boolean);
    const code = v.replace(/\D/g, '');
    const r = S.objets.filter((o) => {
      if (code.length >= 8 && o.code_barres === code) return true;
      const t = cle([nomSerie(o), o.titre, o.auteur, o.dessinateur, o.editeur, o.variante, o.plateforme, o.pays, o.gamme, o.numero && 't' + o.numero, o.code_barres, o.notes].join(' '));
      return mots.every((m) => t.includes(m));
    }).sort((a, b) => (a.statut === 'Possédé' ? 0 : 1) - (b.statut === 'Possédé' ? 0 : 1) || libelleCourt(a).localeCompare(libelleCourt(b), 'fr'));
    if (!r.length) return `<div class="vide"><b>Rien trouvé</b><span class="aide">Ni dans tes possessions, ni dans tes envies, ni dans les tomes manquants.</span><a class="btn petit" href="#/ajouter">Ajouter un objet</a></div>`;
    return `<p class="aide">${r.length} résultat${r.length > 1 ? 's' : ''}</p><div class="liste">${r.slice(0, 150).map((o) => ligneObjet(o, `<span class="badge b-${esc(o.statut)}">${esc(o.statut)}</span>`)).join('')}</div>`;
  }

  // ------------------------------------------------------------------
  // Catégorie
  // ------------------------------------------------------------------
  function pilules(nom, options, actuel) {
    return `<div class="pilules" role="group" aria-label="${esc(nom)}">${options.map(([v, t]) => `<button type="button" class="pilule" data-v="${esc(v)}" aria-pressed="${v === actuel}">${esc(t)}</button>`).join('')}</div>`;
  }
  function ecranCategorie(c, q) {
    const filtre = q.get('f') || 'tous', tri = q.get('t') || 'titre';
    const objets = S.objets.filter((o) => o.categorie === c.id);
    let html = `<a class="retour" href="#/">‹ Accueil</a><div class="entete"><h1>${esc(c.nom)}</h1><a class="btn petit" href="#/ajouter?cat=${c.slug}">Ajouter</a></div>`;
    if (c.series) {
      const series = S.series.filter((s) => s.categorie === c.id).map((s) => {
        const t = objets.filter((o) => o.serie_id === s.id);
        const pos = t.filter((o) => o.statut === 'Possédé');
        const v = pos.slice().sort((a, b) => numTri(a) - numTri(b)).find((o) => image(o));
        return { s, n: t.length, pos: pos.length, img: v && image(v) };
      });
      html += series.length ? `<div class="liste-series">${series.map(({ s, n, pos, img }) => `
        <a class="serie" href="#/s/${s.id}"><span class="vignette" style="background:${couleur(s.nom)}">${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : esc(s.nom.charAt(0))}</span>
        <span class="corps"><span class="nom">${esc(s.nom)}</span><span class="sous">${pos} sur ${n} tome${n > 1 ? 's' : ''}${n - pos ? ' · ' + (n - pos) + ' manquant' + (n - pos > 1 ? 's' : '') : ''}</span>
        <span class="barre"><i style="width:${n ? Math.round(100 * pos / n) : 0}%"></i></span></span></a>`).join('')}</div>` : '';
      html += `<div class="boutons"><button class="btn second petit" id="nouvelle-serie">Nouvelle série</button></div>`;
      const hors = objets.filter((o) => !o.serie_id);
      if (hors.length) html += `<h2>${series.length ? 'Hors série' : 'Tous'}</h2>` + grilleFiltrable(hors, filtre, tri);
      if (!objets.length && !series.length) html += videCat(c);
    } else {
      html += objets.length ? grilleFiltrable(objets, filtre, tri) : videCat(c);
    }
    main.innerHTML = html;
    main.querySelectorAll('[data-filtre] .pilule').forEach((b) => b.onclick = () => { q.set('f', b.dataset.v); location.hash = `#/c/${c.slug}?${q}`; });
    main.querySelectorAll('[data-tri] .pilule').forEach((b) => b.onclick = () => { q.set('t', b.dataset.v); location.hash = `#/c/${c.slug}?${q}`; });
    const ns = document.getElementById('nouvelle-serie');
    if (ns) ns.onclick = async () => {
      const nom = prompt('Nom de la nouvelle série'); if (!nom || !nom.trim()) return;
      try {
        const existe = S.series.find((s) => s.categorie === c.id && cle(s.nom) === cle(nom));
        const s = await trouverOuCreerSerie(c.id, nom);
        if (existe) toast('Cette série existe déjà'); location.hash = '#/s/' + s.id;
      } catch (e) { erreur(e, 'Création impossible'); }
    };
  }
  function videCat(c) {
    return `<div class="vide"><b>Aucune fiche pour l'instant</b><span class="aide">Chaque objet apparaîtra ici avec sa photo ou sa couverture.</span><a class="btn petit" href="#/ajouter?cat=${c.slug}">Ajouter un objet</a></div>`;
  }
  function grilleFiltrable(objets, filtre, tri) {
    let l = objets.filter((o) => filtre === 'tous' || (filtre === 'pos' ? o.statut === 'Possédé' : o.statut === 'Envie'));
    const t = (o) => cle(titreObjet(o));
    l.sort(tri === 'annee' ? (a, b) => (a.annee || 9999) - (b.annee || 9999) : tri === 'recent' ? (a, b) => (b.cree_le || '').localeCompare(a.cree_le || '') : (a, b) => t(a).localeCompare(t(b)));
    return `<div data-filtre>${pilules('Filtre', [['tous', 'Tous'], ['pos', 'Possédés'], ['env', 'Envies']], filtre)}</div>
      <div data-tri>${pilules('Tri', [['titre', 'A → Z'], ['annee', 'Année'], ['recent', 'Derniers ajouts']], tri)}</div>
      ${l.length ? `<div class="grille">${l.map((o) => tuile(o, { badge: true })).join('')}</div>` : '<p class="aide">Aucun objet avec ce filtre.</p>'}`;
  }

  // ------------------------------------------------------------------
  // Série
  // ------------------------------------------------------------------
  function ecranSerie(s, q) {
    const c = CAT[s.categorie];
    const filtre = q.get('f') || 'tous';
    const tomes = S.objets.filter((o) => o.serie_id === s.id).sort((a, b) => numTri(a) - numTri(b) || (a.cycle || '').localeCompare(b.cycle || '', 'fr') || cle(a.variante).localeCompare(cle(b.variante)));
    const pos = tomes.filter((o) => o.statut === 'Possédé').length;
    const vis = tomes.filter((o) => filtre === 'tous' || (filtre === 'pos' ? o.statut === 'Possédé' : o.statut !== 'Possédé'));
    const grilles = `<div class="grille">${vis.map((o) => tuile(o)).join('')}</div>`;
    main.innerHTML = `<a class="retour" href="#/c/${c.slug}">‹ ${esc(c.nom)}</a>
      <div><h1>${esc(s.nom)}</h1><span class="sous">${pos} possédé${pos > 1 ? 's' : ''} sur ${tomes.length} · ${tomes.length - pos} manquant${tomes.length - pos > 1 ? 's' : ''}</span></div>
      <div data-filtre>${pilules('Filtre', [['tous', 'Tous'], ['pos', 'Possédés'], ['manq', 'Manquants']], filtre)}</div>
      ${vis.length ? grilles : '<p class="aide">Aucun tome avec ce filtre.</p>'}
      <div class="boutons">
        <a class="btn petit" href="#/ajouter?cat=${c.slug}&serie=${s.id}">Ajouter un tome</a>
        <button class="btn second petit" id="manquants">Lister des tomes manquants</button>
      </div>
      <div class="boutons"><button class="btn second petit" id="renommer">Renommer la série</button>
        ${tomes.length ? '' : '<button class="btn danger petit" id="suppr-serie">Supprimer la série</button>'}</div>
      <p class="aide">« Lister des tomes manquants » crée d'un coup les tomes que tu n'as pas encore (par exemple de 1 à 12) ; tu complètes ensuite leurs titres si tu veux.</p>`;
    main.querySelectorAll('[data-filtre] .pilule').forEach((b) => b.onclick = () => { location.hash = `#/s/${s.id}?f=${b.dataset.v}`; });
    document.getElementById('renommer').onclick = async () => {
      const nom = prompt('Nouveau nom de la série', s.nom); if (!nom || !nom.trim() || nom === s.nom) return;
      const { error } = await sb.from('series').update({ nom: nom.trim() }).eq('id', s.id);
      if (error) return erreur(error); s.nom = nom.trim(); rafraichir();
    };
    const sup = document.getElementById('suppr-serie');
    if (sup) sup.onclick = async () => {
      if (!confirm('Supprimer la série « ' + s.nom + ' » ?')) return;
      const { error } = await sb.from('series').delete().eq('id', s.id);
      if (error) return erreur(error); S.series = S.series.filter((x) => x.id !== s.id); location.hash = '#/c/' + c.slug;
    };
    document.getElementById('manquants').onclick = async () => {
      const r = prompt('Numéros des tomes à lister comme manquants (ex. « 1-12 » ou « 3, 5, 8 »)'); if (!r) return;
      const nums = new Set();
      for (const part of r.split(/[,;\s]+/)) {
        const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
        if (m) { for (let i = +m[1]; i <= +m[2] && i - +m[1] < 200; i++) nums.add(String(i)); } else if (part.trim()) nums.add(part.trim());
      }
      const existants = new Set(tomes.map((o) => String(o.numero)));
      const lignes = [...nums].filter((n) => !existants.has(n)).map((n) => ({ categorie: s.categorie, statut: 'Manquant', serie_id: s.id, numero: n, ordre: isFinite(+n) ? +n : null }));
      if (!lignes.length) return toast('Ces tomes sont déjà listés');
      const { data, error } = await sb.from('objets').insert(lignes).select();
      if (error) return erreur(error); S.objets.push(...data); toast(data.length + ' tome' + (data.length > 1 ? 's' : '') + ' ajouté' + (data.length > 1 ? 's' : '')); rafraichir();
    };
  }

  // ------------------------------------------------------------------
  // Fiche
  // ------------------------------------------------------------------
  function valeurChamp(o, col, type) {
    if (col === 'serie') return nomSerie(o);
    if (col === 'extension_de') { const j = o.extension_de && parId(o.extension_de); return j ? titreObjet(j) : ''; }
    const v = o[col];
    if (type === 'bool') return v == null ? '' : (v ? 'Oui' : 'Non');
    return v == null ? '' : String(v);
  }
  function ecranFiche(o) {
    const c = CAT[o.categorie];
    const s = o.serie_id && serieDe(o.serie_id);
    const retour = s ? [`#/s/${s.id}`, s.nom] : [`#/c/${c.slug}`, c.nom];
    const champs = c.champs.map(([col, lab, type]) => [lab, valeurChamp(o, col, type)]).filter(([, v]) => v !== '');
    if (o.statut === 'Possédé' && o.categorie !== 'Timbre') champs.push([c.etatLabel || 'État', o.etat || 'À renseigner']);
    if (o.categorie === 'Timbre' && o.statut === 'Possédé') champs.push(['État', o.etat || 'À renseigner']);
    const d = chercheDoublons(o, undefined, [o.id]);
    const cote = lienCote(o);
    const src = image(o);
    const etats = etatsDe(o.categorie);
    main.innerHTML = `<a class="retour" href="${retour[0]}">‹ ${esc(retour[1])}</a>
      <div class="fiche">
        <div class="fiche-haut">${couverture(o)}
          <div class="infos"><span class="badge b-${esc(o.statut)}">${esc(o.statut)}</span><h1>${esc(titreObjet(o))}</h1><span class="sous">${esc(sousTitre(o))}</span></div>
        </div>
        <div class="fiche-col">
          ${d.doublons.length ? `<div class="alerte rouge"><b>Doublon possible</b> : ${d.doublons.map((x) => `<a href="#/o/${x.id}">${esc(libelleCourt(x))} (${esc(x.statut)})</a>`).join(', ')}</div>` : ''}
          ${d.codes.length ? `<div class="alerte">Même code-barres que ${d.codes.map((x) => `<a href="#/o/${x.id}">${esc(libelleCourt(x))}</a>`).join(', ')}</div>` : ''}
          ${d.variantes.length ? `<div class="alerte info">Autre${d.variantes.length > 1 ? 's' : ''} variante${d.variantes.length > 1 ? 's' : ''} : ${d.variantes.map((x) => `<a href="#/o/${x.id}">${esc(x.variante || 'sans variante')}</a>`).join(', ')}</div>` : ''}
          ${o.statut !== 'Possédé' ? '<button class="btn" id="achete">Je viens de l\'acheter</button>' : ''}
          ${champs.length ? `<dl class="champs">${champs.map(([l, v]) => `<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
          ${o.statut === 'Possédé' ? `<div class="champ"><span class="etiquette">${esc(c.etatLabel || 'État de l\'exemplaire')}</span>
            <div class="choix" id="etats">${etats.map((e) => `<button type="button" class="pilule" data-v="${esc(e)}" aria-pressed="${o.etat === e}">${esc(e)}</button>`).join('')}</div></div>` : ''}
          ${o.notes ? `<div class="carte" style="padding:12px 14px"><span class="etiquette">Notes</span><p style="margin:6px 0 0;white-space:pre-wrap">${esc(o.notes)}</p></div>` : ''}
          <label class="btn second">${o.photo_path ? 'Remplacer la photo' : 'Prendre une photo de mon exemplaire'}<input type="file" accept="image/*" id="photo" hidden></label>
          ${o.photo_path ? '<button class="btn-texte" id="sans-photo">Retirer ma photo</button>' : ''}
          <a href="${esc(cote.url)}" target="_blank" rel="noopener">Voir la cote sur ${esc(cote.nom)}</a>
          <div class="boutons"><a class="btn second" href="#/o/${o.id}/modifier">Modifier</a><button class="btn danger" id="supprimer">Supprimer</button></div>
          <p class="aide">Ajouté le ${new Date(o.cree_le).toLocaleDateString('fr-FR')}${o.modifie_le && o.modifie_le !== o.cree_le ? ' · modifié le ' + new Date(o.modifie_le).toLocaleDateString('fr-FR') : ''}</p>
        </div>
      </div>`;
    const cv = main.querySelector('.fiche-haut .couv');
    if (src) cv.onclick = () => { const z = document.createElement('div'); z.className = 'zoom'; z.innerHTML = `<img src="${esc(src)}" alt="">`; z.onclick = () => z.remove(); document.body.appendChild(z); };
    const a = document.getElementById('achete');
    if (a) a.onclick = async () => { try { await majObjet(o.id, { statut: 'Possédé' }); toast('Passé en possédé — indique son état'); rafraichir(); } catch (e) { erreur(e); } };
    main.querySelectorAll('#etats .pilule').forEach((b) => b.onclick = async () => {
      const v = o.etat === b.dataset.v ? null : b.dataset.v;
      try { await majObjet(o.id, { etat: v }); rafraichir(); } catch (e) { erreur(e); }
    });
    document.getElementById('photo').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return; toast('Envoi de la photo…', 20000);
      try { await enregistrerPhoto(o, f); toast('Photo enregistrée'); rafraichir(); } catch (er) { erreur(er, 'Photo non enregistrée'); }
    };
    const sp = document.getElementById('sans-photo');
    if (sp) sp.onclick = async () => {
      if (!confirm('Retirer ta photo de cette fiche ?')) return;
      const ch = o.photo_path; try { await majObjet(o.id, { photo_path: null }); sb.storage.from('photos').remove([ch]); rafraichir(); } catch (e) { erreur(e); }
    };
    document.getElementById('supprimer').onclick = async () => {
      const ext = S.objets.filter((x) => x.extension_de === o.id);
      if (!confirm(`Supprimer « ${libelleCourt(o)} » ?${ext.length ? `\n${ext.length} extension(s) liée(s) seront détachée(s).` : ''}\nUn objet vendu se supprime ainsi.`)) return;
      try {
        if (ext.length) await sb.from('objets').update({ extension_de: null }).eq('extension_de', o.id);
        const { error } = await sb.from('objets').delete().eq('id', o.id); if (error) throw error;
        if (o.photo_path) sb.storage.from('photos').remove([o.photo_path]);
        S.objets = S.objets.filter((x) => x.id !== o.id); ext.forEach((x) => x.extension_de = null);
        toast('Supprimé'); location.hash = retour[0];
      } catch (e) { erreur(e, 'Suppression impossible'); }
    };
  }

  // ------------------------------------------------------------------
  // Formulaire (ajout et modification)
  // ------------------------------------------------------------------
  function ecranFormulaire({ objet, cat, serieId, statut }) {
    // Conserve le brouillon en cours si on revient sur le même écran (ex. après un scan)
    const cleForm = objet ? 'm:' + objet.id : 'a';
    if (!S.form || S.form.cle !== cleForm || S.form.init !== location.hash) {
      const o = objet || {};
      const serie = serieId && serieDe(serieId);
      const catId = o.categorie || (serie && serie.categorie) || cat || (S.form && S.form.cle === 'a' && S.form.cat) || 'BD';
      const vals = {};
      for (const c of CATS) for (const [col] of c.champs) if (col !== 'serie') vals[col] = o[col] == null ? '' : o[col];
      vals.serie = o.serie_id ? nomSerie(o) : (serie ? serie.nom : '');
      S.form = {
        cle: cleForm, init: location.hash, id: o.id || null, cat: catId, vals,
        statut: o.statut || statut || (serie ? 'Possédé' : 'Possédé'), etat: o.etat || '', notes: o.notes || '', lien_cote: o.lien_cote || '',
        couverture_url: o.couverture_url || '', photo: null, photoUrl: '', remplis: new Set(), messages: [], candidats: null, cible: null, force: false,
      };
    }
    dessinerFormulaire();
  }
  function dessinerFormulaire() {
    const F = S.form, c = CAT[F.cat];
    const modif = !!F.id;
    const seriesCat = S.series.filter((s) => s.categorie === F.cat);
    const statuts = ['Possédé', 'Envie'].concat(c.series && !vide(F.vals.serie) ? ['Manquant'] : []);
    if (!statuts.includes(F.statut)) F.statut = 'Possédé';
    const champ = ([col, lab, type = 'txt', aide = '']) => {
      const id = 'f-' + col, v = F.vals[col] == null ? '' : F.vals[col], cls = F.remplis.has(col) ? 'rempli' : '';
      if (type === 'bool') return `<div class="champ"><label for="${id}">${esc(lab)}</label><select id="${id}" data-col="${col}">
        <option value="">—</option><option value="true" ${v === true || v === 'true' ? 'selected' : ''}>Oui</option><option value="false" ${v === false || v === 'false' ? 'selected' : ''}>Non</option></select></div>`;
      if (type.startsWith('liste:')) return `<div class="champ"><label for="${id}">${esc(lab)}</label><select id="${id}" data-col="${col}"><option value="">—</option>
        ${type.slice(6).split('|').map((x) => `<option ${v === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>`;
      if (type === 'extension') {
        const jeux = S.objets.filter((x) => x.categorie === 'Jeu de société' && x.id !== F.id && !x.extension_de).sort((a, b) => cle(a.titre).localeCompare(cle(b.titre)));
        return `<div class="champ"><label for="${id}">${esc(lab)}</label><select id="${id}" data-col="${col}"><option value="">Ce n'est pas une extension</option>
          ${jeux.map((j) => `<option value="${j.id}" ${v === j.id ? 'selected' : ''}>${esc(titreObjet(j))}${j.variante ? ' (' + esc(j.variante) + ')' : ''}</option>`).join('')}</select></div>`;
      }
      const attrs = type === 'int' ? 'inputmode="numeric" pattern="[0-9]*"' : type === 'code' ? 'inputmode="numeric"' : '';
      const liste = type === 'serie' ? `list="dl-series"` : '';
      return `<div class="champ"><label for="${id}">${esc(lab)}</label><input id="${id}" data-col="${col}" class="${cls}" value="${esc(v)}" placeholder="${esc(aide)}" ${attrs} ${liste} autocomplete="off"></div>`;
    };
    const apercu = F.photoUrl || (F.id && parId(F.id) && parId(F.id).photo_path && S.urls.get(parId(F.id).photo_path)) || F.couverture_url;
    main.innerHTML = `
      ${modif ? `<a class="retour" href="#/o/${F.id}">‹ Annuler</a><h1>Modifier</h1>` : '<h1>Ajouter</h1>'}
      ${modif ? '' : `<div class="champ"><span class="etiquette">Catégorie</span><div class="pilules" id="f-cats">${CATS.map((x) => `<button type="button" class="pilule" data-v="${esc(x.id)}" aria-pressed="${x.id === F.cat}">${esc(x.id)}</button>`).join('')}</div></div>`}
      ${c.scan ? `<button type="button" class="btn" id="scanner-btn">Scanner le code-barres</button>
        <p class="aide">${c.scan === 'jeu' ? "Pour les jeux, le scan enregistre le code-barres et propose un titre brut environ une fois sur deux : complète le reste à la main." : 'Le scan remplit la fiche quand le code-barres est reconnu. Vérifie les champs surlignés.'}</p>` : `<p class="aide">Pas de code-barres exploitable pour cette catégorie : saisie à la main, puis photo.</p>`}
      <div id="f-messages">${F.messages.map((m) => `<div class="alerte ${m.cls || ''}">${m.html}</div>`).join('')}</div>
      ${F.candidats ? `<div class="candidats"><span class="etiquette">Plusieurs éditions répondent à ce code : choisis la tienne</span>${F.candidats.map((k, i) => `
        <button type="button" class="candidat" data-i="${i}">${k.couverture_url ? `<img src="${esc(k.couverture_url)}" alt="" onerror="this.style.visibility='hidden'">` : '<img alt="">'}
        <span><b>${esc([k.auteur, k.titre].filter(Boolean).join(' — '))}</b><small>${esc([k.editeur, k.precision].filter(Boolean).join(' · '))}</small></span></button>`).join('')}
        <button type="button" class="btn-texte" id="aucun">Aucune ne correspond</button></div>` : ''}
      <form id="formulaire" class="form" novalidate>
        <div class="grille-form">${c.champs.map(champ).join('')}</div>
        <datalist id="dl-series">${seriesCat.map((s) => `<option value="${esc(s.nom)}">`).join('')}</datalist>
        <div class="champ"><span class="etiquette">Statut</span><div class="choix" id="f-statut">${statuts.map((x) => `<button type="button" class="pilule" data-v="${x}" aria-pressed="${F.statut === x}">${x}</button>`).join('')}</div></div>
        ${F.statut === 'Possédé' ? `<div class="champ"><span class="etiquette">${esc(c.etatLabel || 'État')}</span><div class="choix" id="f-etat">${etatsDe(F.cat).map((x) => `<button type="button" class="pilule" data-v="${esc(x)}" aria-pressed="${F.etat === x}">${esc(x)}</button>`).join('')}</div></div>` : ''}
        <div class="apercu-photo">${apercu ? `<img src="${esc(apercu)}" alt="" onerror="this.remove()">` : ''}
          <label class="btn second" style="flex:1">${apercu ? 'Changer la photo' : 'Prendre une photo'}<input type="file" accept="image/*" id="f-photo" hidden></label></div>
        <div class="champ"><label for="f-notes">Notes</label><textarea id="f-notes">${esc(F.notes)}</textarea></div>
        <div class="champ"><label for="f-cote">Lien vers la cote (facultatif)</label><input id="f-cote" type="url" value="${esc(F.lien_cote)}" placeholder="Laisser vide : lien automatique"></div>
        <button class="btn vert" type="submit" id="enregistrer">Enregistrer</button>
      </form>`;

    main.querySelectorAll('#f-cats .pilule').forEach((b) => b.onclick = () => { F.cat = b.dataset.v; F.etat = ''; F.messages = []; F.candidats = null; F.cible = null; dessinerFormulaire(); });
    const sc = document.getElementById('scanner-btn'); if (sc) sc.onclick = () => ouvrirScanner(apresScan);
    main.querySelectorAll('[data-col]').forEach((el) => {
      el.addEventListener('input', () => { F.vals[el.dataset.col] = el.value; el.classList.remove('rempli'); F.remplis.delete(el.dataset.col); });
      if (['serie', 'numero', 'cycle'].includes(el.dataset.col)) el.addEventListener('change', () => { F.cible = null; F.messages = F.messages.filter((m) => !m.tome); verifierTomeExistant(); dessinerFormulaire(); });
    });
    main.querySelectorAll('#f-statut .pilule').forEach((b) => b.onclick = () => { F.statut = b.dataset.v; dessinerFormulaire(); });
    main.querySelectorAll('#f-etat .pilule').forEach((b) => b.onclick = () => { F.etat = F.etat === b.dataset.v ? '' : b.dataset.v; dessinerFormulaire(); });
    document.getElementById('f-notes').oninput = (e) => F.notes = e.target.value;
    document.getElementById('f-cote').oninput = (e) => F.lien_cote = e.target.value;
    document.getElementById('f-photo').onchange = (e) => { const f = e.target.files[0]; if (!f) return; F.photo = f; F.photoUrl = URL.createObjectURL(f); dessinerFormulaire(); };
    main.querySelectorAll('.candidat').forEach((b) => b.onclick = () => { appliquerCandidat(F.candidats[+b.dataset.i]); F.candidats = null; dessinerFormulaire(); });
    const au = document.getElementById('aucun'); if (au) au.onclick = () => { F.candidats = null; dessinerFormulaire(); };
    main.querySelectorAll('[data-action]').forEach((b) => b.onclick = () => actionMessage(b.dataset.action, b.dataset.id));
    document.getElementById('formulaire').onsubmit = (e) => { e.preventDefault(); enregistrer(); };
  }

  function actionMessage(action, id) {
    const F = S.form;
    if (action === 'forcer') { F.force = true; enregistrer(); }
    else if (action === 'cible') {
      const x = parId(id); F.cible = id; F.force = true;
      // Reprend les champs déjà connus du tome existant quand le formulaire est vide
      for (const [col] of CAT[F.cat].champs) if (col !== 'serie' && vide(F.vals[col]) && x[col] != null) F.vals[col] = x[col];
      enregistrer();
    }
  }

  // Applique un résultat de recherche au formulaire (sans écraser ce qui est déjà saisi)
  function appliquerCandidat(k) {
    const F = S.form, cols = new Set(CAT[F.cat].champs.map(([c]) => c));
    const map = { ...k };
    if (F.cat === 'Vinyle') map.annee = k.annee_exemplaire || k.annee;
    if ((F.cat === 'Manga' || F.cat === 'Livre') && !map.annee) map.annee = k.annee_exemplaire;
    if (F.cat === 'Livre' && map.serie && !map.titre) { map.titre = map.serie + (map.numero ? ' — tome ' + map.numero : ''); }
    if (map.serie) {
      const ex = S.series.find((s) => s.categorie === F.cat && (cle(s.nom) === cle(map.serie) || cle(s.nom).endsWith(cle(map.serie)) || cle(map.serie).endsWith(cle(s.nom))));
      if (ex) map.serie = ex.nom;
    }
    for (const col of cols) {
      if (col === 'code_barres' || map[col] == null || map[col] === '') continue;
      if (vide(F.vals[col])) { F.vals[col] = map[col]; F.remplis.add(col); }
    }
    if (k.couverture_url && !F.couverture_url) F.couverture_url = k.couverture_url;
    F.messages = F.messages.filter((m) => !m.source);
    F.messages.push({ source: true, cls: 'vert', html: `Fiche remplie depuis ${esc(k.source)}. Vérifie les champs surlignés${F.cat === 'BD' && !k.titre ? ', le titre de l\'album n\'a pas été trouvé' : ''}.` });
    verifierTomeExistant();
  }

  // Si la série et le tome saisis existent déjà en Manquant/Envie, propose de les passer en possédé
  function verifierTomeExistant() {
    const F = S.form;
    if (!CAT[F.cat].series || vide(F.vals.serie) || vide(F.vals.numero) || F.id) return;
    const s = S.series.find((x) => x.categorie === F.cat && cle(x.nom) === cle(F.vals.serie));
    if (!s) return;
    const t = S.objets.find((o) => o.serie_id === s.id && String(o.numero) === String(F.vals.numero) && cle(o.variante) === cle(F.vals.variante) && (vide(F.vals.cycle) || cle(o.cycle) === cle(F.vals.cycle)));
    if (!t) return;
    F.messages = F.messages.filter((m) => !m.tome);
    if (t.statut === 'Possédé') F.messages.push({ tome: true, cls: 'rouge', html: `<b>Tu l'as déjà</b> : <a href="#/o/${t.id}">${esc(libelleCourt(t))}</a>.` });
    else { F.cible = t.id; F.messages.push({ tome: true, html: `Ce tome est listé « ${esc(t.statut)} » dans ${esc(s.nom)} : l'enregistrer le passera en possédé.` }); }
  }

  async function apresScan(code) {
    const F = S.form;
    F.vals.code_barres = code; F.remplis.add('code_barres'); F.messages = []; F.candidats = null; F.cible = null;
    const memes = S.objets.filter((o) => o.code_barres === code && o.id !== F.id);
    const possede = memes.find((o) => o.statut === 'Possédé');
    const attente = memes.find((o) => o.statut !== 'Possédé');
    if (possede) F.messages.push({ cls: 'rouge', html: `<b>Déjà dans ta collection</b> : <a href="#/o/${possede.id}">${esc(libelleCourt(possede))}</a>${possede.variante ? ' (' + esc(possede.variante) + ')' : ''}. Tu peux quand même l'enregistrer s'il s'agit d'un second exemplaire.` });
    else if (attente) {
      F.cible = attente.id;
      if (attente.categorie !== F.cat) F.cat = attente.categorie;
      F.vals.serie = nomSerie(attente) || F.vals.serie;
      for (const [col] of CAT[F.cat].champs) if (col !== 'serie' && attente[col] != null && attente[col] !== '') F.vals[col] = attente[col];
      F.messages.push({ tome: true, html: `Ce code correspond à <a href="#/o/${attente.id}">${esc(libelleCourt(attente))}</a>, listé « ${esc(attente.statut)} » : l'enregistrer le passera en possédé.` });
    }
    F.messages.push({ source: true, cls: 'info', html: 'Recherche de la fiche…' });
    dessinerFormulaire();
    try {
      const { data, error } = await sb.functions.invoke('recherche', { body: { code, categorie: F.cat } });
      if (S.form !== F) return;
      if (error) throw error;
      const k = (data && data.candidats) || [];
      F.messages = F.messages.filter((m) => !m.source);
      if (!k.length) F.messages.push({ source: true, cls: '', html: `Code ${esc(code)} non reconnu par ${esc((data.sources || []).join(', '))}. Il est enregistré ; complète la fiche à la main${CAT[F.cat].scan === 'musique' || CAT[F.cat].scan === 'livre' ? ' et prends une photo' : ''}.` });
      else if (k.length === 1) appliquerCandidat(k[0]);
      else if (CAT[F.cat].scan === 'musique') F.candidats = k;
      else appliquerCandidat(k[0]);
    } catch (e) {
      F.messages = F.messages.filter((m) => !m.source);
      F.messages.push({ source: true, cls: '', html: 'Recherche indisponible pour l\'instant : le code est enregistré, complète la fiche à la main.' });
      console.warn(e);
    }
    if (S.form === F) dessinerFormulaire();
  }

  async function enregistrer() {
    const F = S.form, c = CAT[F.cat];
    const btn = document.getElementById('enregistrer');
    const p = { categorie: F.cat, statut: F.statut, notes: F.notes.trim() || null, lien_cote: F.lien_cote.trim() || null, couverture_url: F.couverture_url || null };
    for (const [col, , type = 'txt'] of c.champs) {
      if (col === 'serie') continue;
      let v = F.vals[col];
      if (type === 'bool') v = v === true || v === 'true' ? true : v === false || v === 'false' ? false : null;
      else if (type === 'int') { v = String(v ?? '').replace(/\D/g, ''); v = v ? parseInt(v, 10) : null; }
      else if (type === 'code') { v = String(v ?? '').replace(/[^0-9Xx]/g, '').toUpperCase() || null; }
      else if (type === 'extension') v = v || null;
      else v = vide(v) ? null : String(v).trim();
      p[col] = v;
    }
    p.etat = F.statut === 'Possédé' && F.etat ? F.etat : null;
    if (p.numero) { const n = parseFloat(String(p.numero).replace(',', '.')); p.ordre = isFinite(n) ? n : null; }
    const nomS = c.series ? String(F.vals.serie || '').trim() : '';
    // Contrôles
    const principal = nomS || p.titre || p.valeur_faciale || p.pays || p.auteur;
    if (!principal) return toast('Remplis au moins le ' + c.champs[0][1].toLowerCase().replace(' (facultatif)', ''));
    if (F.statut === 'Manquant' && !nomS) return toast('Le statut Manquant demande une série');
    if (p.annee && (p.annee < 1800 || p.annee > 2100)) return toast('Année hors limites');
    // Doublons (alerte, jamais de blocage)
    if (!F.force) {
      const exclure = [F.id, F.cible].filter(Boolean);
      const d = chercheDoublons(p, nomS, exclure);
      const enAttente = d.doublons.find((x) => x.statut !== 'Possédé');
      if (d.doublons.length || d.codes.length) {
        F.messages = F.messages.filter((m) => !m.dbl);
        const l = (arr) => arr.map((x) => `<a href="#/o/${x.id}">${esc(libelleCourt(x))}</a> (${esc(x.statut)}${x.variante ? ', ' + esc(x.variante) : ''})`).join(', ');
        let html = d.doublons.length ? `<b>Doublon</b> : tu as déjà ${l(d.doublons)}.` : `<b>Même code-barres</b> que ${l(d.codes)}.`;
        html += '<div class="boutons">';
        if (enAttente && F.statut === 'Possédé' && !F.id) html += `<button type="button" class="btn petit" data-action="cible" data-id="${enAttente.id}">Passer celui-ci en possédé</button>`;
        html += `<button type="button" class="btn second petit" data-action="forcer">Enregistrer quand même</button></div>`;
        F.messages.push({ dbl: true, cls: d.doublons.length ? 'rouge' : '', html });
        dessinerFormulaire(); window.scrollTo(0, 0); return;
      }
    }
    if (btn) btn.disabled = true;
    try {
      const serie = nomS ? await trouverOuCreerSerie(F.cat, nomS) : null;
      p.serie_id = serie ? serie.id : null;
      if (!c.series) { p.serie_id = null; }
      let o;
      const id = F.id || F.cible;
      if (id) {
        if (F.cible && !F.id) { p.statut = 'Possédé'; for (const k of Object.keys(p)) if (p[k] == null && parId(id)[k] != null && k !== 'etat') delete p[k]; }
        o = await majObjet(id, p);
      } else {
        const { data, error } = await sb.from('objets').insert(p).select().single();
        if (error) throw error; o = data; S.objets.push(o);
      }
      if (F.photo) { try { o = await enregistrerPhoto(o, F.photo); } catch (e) { erreur(e, 'Fiche enregistrée mais photo refusée'); } }
      const d = chercheDoublons(o, undefined, [o.id]);
      S.form = null;
      toast(d.variantes.length ? 'Enregistré · info : tu l\'as aussi dans une autre variante' : 'Enregistré');
      location.hash = '#/o/' + o.id;
    } catch (e) {
      erreur(e, 'Enregistrement impossible');
      if (btn) btn.disabled = false;
    }
  }

  // ------------------------------------------------------------------
  // Scanner de codes-barres (ZXing : fonctionne aussi sur iPhone)
  // ------------------------------------------------------------------
  let lecteur = null, rappelScan = null;
  const elScan = document.getElementById('scanner');
  function eanValide(t) {
    if (!/^\d{8}$|^\d{12,13}$/.test(t)) return false;
    const d = t.padStart(13, '0').split('').map(Number), s = d.slice(0, 12).reduce((a, x, i) => a + x * (i % 2 ? 3 : 1), 0);
    return t.length === 8 ? true : (10 - (s % 10)) % 10 === d[12];
  }
  async function ouvrirScanner(cb) {
    rappelScan = cb; S.scanActif = true;
    elScan.hidden = false; document.getElementById('scan-erreur').textContent = ''; document.getElementById('scan-saisie').value = '';
    try {
      const Z = await chargerScript('vendor/zxing.min.js', 'ZXing');
      const hints = new Map();
      hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
      hints.set(Z.DecodeHintType.TRY_HARDER, true);
      lecteur = new Z.BrowserMultiFormatReader(hints, 250);
      let precedent = '';
      await lecteur.decodeFromConstraints({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } }, 'scan-video', (res) => {
        if (!res || !S.scanActif) return;
        let t = res.getText();
        if (res.getBarcodeFormat() === Z.BarcodeFormat.UPC_A && t.length === 12) t = '0' + t;
        if (!eanValide(t) && t !== precedent) { precedent = t; return; } // relecture exigée si la clé de contrôle ne colle pas
        if (navigator.vibrate) navigator.vibrate(60);
        terminerScan(t);
      });
    } catch (e) {
      console.warn(e);
      document.getElementById('scan-erreur').textContent = /Permission|NotAllowed/i.test(e && (e.name + e.message)) ? "Accès à l'appareil photo refusé : autorise-le dans les réglages, ou saisis le code." : "Appareil photo indisponible : saisis le code à la main.";
    }
  }
  function fermerScanner() {
    S.scanActif = false; elScan.hidden = true;
    if (lecteur) { try { lecteur.reset(); } catch (e) { /* rien */ } lecteur = null; }
  }
  function terminerScan(code) { const cb = rappelScan; fermerScanner(); if (cb) cb(code); }
  document.getElementById('scan-fermer').onclick = fermerScanner;
  document.getElementById('scan-manuel').onsubmit = (e) => {
    e.preventDefault();
    const t = document.getElementById('scan-saisie').value.replace(/[^0-9Xx]/g, '').toUpperCase();
    if (t.length < 8) { document.getElementById('scan-erreur').textContent = 'Code trop court (8 caractères au moins).'; return; }
    terminerScan(t);
  };

  // ------------------------------------------------------------------
  // Envies
  // ------------------------------------------------------------------
  function ecranEnvies() {
    const envies = S.objets.filter((o) => o.statut === 'Envie').sort((a, b) => a.categorie.localeCompare(b.categorie, 'fr') || cle(titreObjet(a)).localeCompare(cle(titreObjet(b))));
    const sugg = S.objets.filter((o) => o.statut === 'Manquant').sort((a, b) => (b.annee || 0) - (a.annee || 0) || numTri(b) - numTri(a)).slice(0, 12);
    main.innerHTML = `<div class="entete"><h1>Envies</h1><a class="btn petit" href="#/ajouter?statut=Envie">Ajouter une envie</a></div>
      <h2>Ma liste</h2>
      ${envies.length ? `<div class="liste">${envies.map((o) => ligneObjet(o, '<span class="badge b-Envie">Envie</span>')).join('')}</div>` : '<p class="aide">Aucune envie pour l\'instant.</p>'}
      <h2>Suggestions dans tes séries</h2>
      <p class="aide">Les tomes manquants les plus récents, parmi ceux listés dans le catalogue. Les nouvelles parutions non saisies n'apparaissent pas.</p>
      <div class="liste">${sugg.map((o) => `<a class="ligne-objet" href="#/o/${o.id}"><span class="num-suggest">${esc(o.numero || '')}</span>
        <span class="txt"><b>${esc(o.titre || nomSerie(o) + ' — tome ' + (o.numero || '?'))}</b><span>${esc([nomSerie(o), o.numero && 'tome ' + o.numero, o.annee].filter(Boolean).join(' · '))}</span></span></a>`).join('')}</div>`;
  }

  // ------------------------------------------------------------------
  // Doublons
  // ------------------------------------------------------------------
  function ecranDoublons() {
    const l = tousDoublons();
    main.innerHTML = `<a class="retour" href="#/">‹ Accueil</a><h1>Doublons</h1>
      <p class="aide">Même catégorie, même titre (ou même série et tome) et même variante, en ignorant accents, majuscules et article initial ; ou même code-barres. Simple alerte : supprime l'une des fiches s'il n'y a qu'un exemplaire.</p>
      ${l.length ? l.map((g) => `<div class="carte" style="padding:12px 14px;display:flex;flex-direction:column;gap:8px"><span class="badge ${g.type === 'Doublon' ? 'b-Manquant' : 'b-Envie'}" style="align-self:flex-start">${esc(g.type)}</span>
        <div class="liste">${g.objets.map((o) => ligneObjet(o, `<span class="badge b-${esc(o.statut)}">${esc(o.statut)}</span>`)).join('')}</div></div>`).join('') : '<div class="alerte vert">Aucun doublon.</div>'}`;
  }

  // ------------------------------------------------------------------
  // Réglages, export
  // ------------------------------------------------------------------
  function ecranReglages() {
    main.innerHTML = `<a class="retour" href="#/">‹ Accueil</a><h1>Réglages</h1>
      <div class="liste">
        <a class="ligne-objet" href="#/import"><span class="txt"><b>Ajout en masse</b><span>Depuis un fichier Excel, CSV ou un copier-coller de Sheets (sur PC)</span></span></a>
        <a class="ligne-objet" href="#/doublons"><span class="txt"><b>Doublons</b><span>${tousDoublons().length} à vérifier</span></span></a>
        <button class="ligne-objet" id="export" style="text-align:left"><span class="txt"><b>Exporter toute la collection</b><span>Fichier Excel, à garder où tu veux</span></span></button>
      </div>
      <form id="f-nouveau-mdp" class="form carte" style="padding:14px">
        <div class="champ"><label for="nouveau-mdp">Définir ou changer mon mot de passe</label><input id="nouveau-mdp" type="password" autocomplete="new-password" minlength="8"></div>
        <p class="aide">Utile sur iPhone : l'appli installée sur l'écran d'accueil ne récupère pas la connexion faite par le lien e-mail dans Safari. 8 caractères au moins.</p>
        <button class="btn second petit" type="submit">Enregistrer le mot de passe</button>
      </form>
      <p class="aide">Connecté : ${esc(S.session.user.email)} · ${S.objets.length} fiches · ${S.series.length} séries</p>
      <button class="btn second" id="deco">Se déconnecter</button>`;
    document.getElementById('f-nouveau-mdp').onsubmit = async (e) => {
      e.preventDefault();
      const password = document.getElementById('nouveau-mdp').value;
      if (password.length < 8) return toast('8 caractères au moins');
      const { error } = await sb.auth.updateUser({ password });
      if (error) return erreur(error, 'Mot de passe non enregistré');
      document.getElementById('nouveau-mdp').value = ''; toast('Mot de passe enregistré');
    };
    document.getElementById('deco').onclick = async () => { await sb.auth.signOut(); };
    document.getElementById('export').onclick = exporter;
  }
  const COLONNES_EXPORT = ['categorie', 'statut', 'serie', 'cycle', 'numero', 'titre', 'variante', 'auteur', 'dessinateur', 'editeur', 'annee', 'annee_exemplaire', 'code_barres', 'format', 'plateforme', 'extension_de', 'complet', 'accessoires', 'boite_origine', 'fonctionne', 'gamme', 'pays', 'valeur_faciale', 'metal', 'atelier', 'conservation', 'etat', 'notes', 'lien_cote', 'couverture_url', 'photo_path', 'id', 'cree_le', 'modifie_le'];
  async function exporter() {
    try {
      const X = await chargerScript('vendor/xlsx.mini.min.js', 'XLSX');
      const lignes = S.objets.slice().sort((a, b) => a.categorie.localeCompare(b.categorie) || cle(nomSerie(a)).localeCompare(cle(nomSerie(b))) || numTri(a) - numTri(b) || cle(a.titre).localeCompare(cle(b.titre)))
        .map((o) => Object.fromEntries(COLONNES_EXPORT.map((k) => [k, k === 'serie' ? nomSerie(o) : k === 'extension_de' ? (o.extension_de && parId(o.extension_de) ? titreObjet(parId(o.extension_de)) : '') : (o[k] == null ? '' : o[k])])));
      const wb = X.utils.book_new();
      X.utils.book_append_sheet(wb, X.utils.json_to_sheet(lignes, { header: COLONNES_EXPORT }), 'Objets');
      X.writeFile(wb, `collection-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) { erreur(e, 'Export impossible'); }
  }

  // ------------------------------------------------------------------
  // Ajout en masse
  // ------------------------------------------------------------------
  const ALIAS = {
    serie: ['serie', 'series', 'collection'], cycle: ['cycle'], numero: ['tome', 'numero', 'num', 'no', 'volume', 'vol'],
    titre: ['titre', 'title', 'album', 'nom', 'nomdujeu', 'jeu', 'modele', 'personnage', 'sujet', 'titredelalbum', 'titredulivre', 'titredujeu', 'personnageoumodele', 'sujetrepresente'],
    variante: ['variante', 'edition', 'version', 'editionouversion', 'typedefrappe', 'presentation'],
    auteur: ['auteur', 'auteurs', 'scenario', 'scenariste', 'artiste', 'artist', 'author'], dessinateur: ['dessin', 'dessinateur'],
    editeur: ['editeur', 'label', 'fabricant', 'marque', 'publisher', 'brand'], annee: ['annee', 'year', 'anneedeparution', 'anneedesortie', 'millesime', 'anneedemission', 'anneedupressage', 'parution', 'date'],
    annee_exemplaire: ['anneeexemplaire', 'anneedelexemplaire'], code_barres: ['codebarres', 'isbn', 'ean', 'upc', 'gencod', 'barcode'],
    format: ['format'], plateforme: ['plateforme', 'platform', 'console'], complet: ['complet'], accessoires: ['accessoires', 'accessoiresfournis'],
    boite_origine: ['boite', 'boitedorigine', 'boiteorigine'], fonctionne: ['fonctionne'], gamme: ['gamme', 'licence', 'gammeoulicence'],
    pays: ['pays', 'country'], valeur_faciale: ['valeurfaciale', 'valeur', 'faciale'], metal: ['metal'], atelier: ['atelier'], conservation: ['conservation'],
    etat: ['etat', 'condition'], statut: ['statut', 'status', 'possede'], notes: ['notes', 'note', 'commentaire', 'remarque'], lien_cote: ['liencote', 'cote', 'lien'],
    categorie: ['categorie', 'type'],
  };
  function devinerColonne(entete) {
    const k = cle(entete);
    for (const [col, al] of Object.entries(ALIAS)) if (al.includes(k)) return col;
    return '';
  }
  function ecranImport() {
    main.innerHTML = `<a class="retour" href="#/reglages">‹ Réglages</a><h1>Ajout en masse</h1>
      <p class="aide">Une ligne par objet, première ligne = intitulés de colonnes (Série, Tome, Titre, Auteur, Éditeur, Année, Code-barres, État, Statut…). Les colonnes sont reconnues automatiquement ; tu peux corriger la correspondance avant d'importer. Statut vide = Possédé ; « envie » ou « manquant » sont reconnus.</p>
      <div class="champ"><span class="etiquette">Catégorie par défaut (si le fichier n'a pas de colonne Catégorie)</span><select id="i-cat" class="recherche">${CATS.map((c) => `<option>${esc(c.id)}</option>`).join('')}</select></div>
      <label class="btn second">Choisir un fichier Excel ou CSV<input type="file" id="i-fichier" accept=".xlsx,.xls,.csv,.tsv,.txt" hidden></label>
      <div class="champ"><label for="i-texte">Ou colle ici des lignes copiées depuis Sheets ou Excel</label><textarea id="i-texte" rows="6" style="font-family:monospace;font-size:13px"></textarea></div>
      <button class="btn second" id="i-lire">Analyser le texte collé</button>
      <div id="i-resultat"></div>`;
    document.getElementById('i-fichier').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const X = await chargerScript('vendor/xlsx.mini.min.js', 'XLSX');
        const wb = X.read(await f.arrayBuffer(), { type: 'array', cellDates: false });
        const lignes = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
        analyserImport(lignes);
      } catch (er) { erreur(er, 'Fichier illisible'); }
    };
    document.getElementById('i-lire').onclick = () => {
      const t = document.getElementById('i-texte').value.trim(); if (!t) return;
      const sep = t.split('\n')[0].includes('\t') ? '\t' : (t.split('\n')[0].includes(';') ? ';' : ',');
      analyserImport(t.split(/\r?\n/).map((l) => l.split(sep).map((x) => x.replace(/^"|"$/g, '').trim())));
    };
  }
  let IMPORT = null;
  function analyserImport(lignes) {
    lignes = lignes.filter((l) => l.some((x) => String(x).trim()));
    if (lignes.length < 2) return toast('Il faut une ligne d\'intitulés et au moins une ligne de données');
    const entetes = lignes[0].map(String);
    IMPORT = { entetes, map: entetes.map(devinerColonne), lignes: lignes.slice(1), catDefaut: document.getElementById('i-cat').value };
    dessinerImport();
  }
  function construireLigne(l) {
    const r = { categorie: IMPORT.catDefaut }; let nomS = '';
    IMPORT.map.forEach((col, i) => {
      if (!col) return; const v = String(l[i] == null ? '' : l[i]).trim(); if (!v) return;
      if (col === 'serie') nomS = v; else r[col] = v;
    });
    if (r.categorie && !CAT[r.categorie]) { const c = CATS.find((x) => cle(x.id) === cle(r.categorie) || cle(x.nom) === cle(r.categorie)); r.categorie = c ? c.id : IMPORT.catDefaut; }
    const st = cle(r.statut || '');
    r.statut = /envie|souhait|wish/.test(st) ? 'Envie' : /manq/.test(st) ? 'Manquant' : 'Possédé';
    for (const k of ['annee', 'annee_exemplaire']) if (r[k]) { const m = String(r[k]).match(/(1[89]\d\d|20\d\d)/); r[k] = m ? +m[1] : null; }
    for (const k of ['complet', 'boite_origine', 'fonctionne']) if (r[k] != null) r[k] = /^(o|oui|y|yes|vrai|true|1|x)$/i.test(r[k]) ? true : /^(n|non|no|faux|false|0)$/i.test(r[k]) ? false : null;
    if (r.code_barres) r.code_barres = String(r.code_barres).replace(/[^0-9Xx]/g, '').toUpperCase() || null;
    if (r.numero) { const n = parseFloat(String(r.numero).replace(',', '.')); r.ordre = isFinite(n) ? n : null; }
    const notes = [];
    if (r.etat) { const e = etatsDe(r.categorie).find((x) => cle(x) === cle(r.etat)); if (!e) notes.push('État d\'origine : ' + r.etat); r.etat = e || null; }
    if (r.statut !== 'Possédé') r.etat = null;
    if (r.conservation && r.categorie !== 'Timbre') { notes.push('Conservation : ' + r.conservation); delete r.conservation; }
    if (!CAT[r.categorie].series) { if (nomS) notes.push('Série : ' + nomS); nomS = ''; }
    if (r.statut === 'Manquant' && !nomS) r.statut = 'Envie';
    if (notes.length) r.notes = [r.notes, ...notes].filter(Boolean).join('\n');
    delete r.extension_de;
    const d = chercheDoublons(r, nomS);
    return { r, nomS, doublon: d.doublons.length ? d.doublons[0] : (d.codes[0] || null), vide: !(nomS || r.titre || r.valeur_faciale || r.pays || r.auteur) };
  }
  function dessinerImport() {
    const cols = Object.keys(ALIAS);
    const prep = IMPORT.lignes.map(construireLigne);
    const nbD = prep.filter((x) => x.doublon).length, nbV = prep.filter((x) => x.vide).length;
    const apercu = prep.slice(0, 30);
    document.getElementById('i-resultat').innerHTML = `
      <h2 style="margin-top:8px">Correspondance des colonnes</h2>
      <div class="defile"><table class="apercu"><tr><th>Colonne du fichier</th><th>Champ du catalogue</th></tr>
      ${IMPORT.entetes.map((e, i) => `<tr><td>${esc(e)}</td><td><select data-i="${i}" class="i-map"><option value="">(ignorer)</option>${cols.map((c) => `<option ${IMPORT.map[i] === c ? 'selected' : ''}>${c}</option>`).join('')}</select></td></tr>`).join('')}</table></div>
      <h2>Aperçu (${prep.length} ligne${prep.length > 1 ? 's' : ''})</h2>
      ${nbD ? `<div class="alerte rouge">${nbD} ligne${nbD > 1 ? 's' : ''} déjà présente${nbD > 1 ? 's' : ''} dans le catalogue (doublon ou même code-barres).</div>` : ''}
      ${nbV ? `<div class="alerte">${nbV} ligne${nbV > 1 ? 's' : ''} sans titre ni série : ignorée${nbV > 1 ? 's' : ''}.</div>` : ''}
      <div class="defile"><table class="apercu"><tr><th></th><th>Catégorie</th><th>Statut</th><th>Série / tome</th><th>Titre</th><th>Auteur</th><th>Année</th><th>Code</th></tr>
      ${apercu.map((x) => `<tr><td>${x.vide ? '⨯' : x.doublon ? '⚠︎' : '✓'}</td><td>${esc(x.r.categorie)}</td><td>${esc(x.r.statut)}</td><td>${esc([x.nomS, x.r.numero].filter(Boolean).join(' T'))}</td><td>${esc(x.r.titre)}</td><td>${esc(x.r.auteur)}</td><td>${esc(x.r.annee)}</td><td>${esc(x.r.code_barres)}</td></tr>`).join('')}</table></div>
      ${prep.length > 30 ? `<p class="aide">… et ${prep.length - 30} autres lignes.</p>` : ''}
      <label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="i-sauter" checked> Ne pas importer les lignes déjà présentes</label>
      <button class="btn vert" id="i-go">Importer</button>`;
    document.querySelectorAll('.i-map').forEach((s) => s.onchange = () => { IMPORT.map[+s.dataset.i] = s.value; dessinerImport(); });
    document.getElementById('i-go').onclick = () => lancerImport(prep, document.getElementById('i-sauter').checked);
  }
  async function lancerImport(prep, sauter) {
    const a = prep.filter((x) => !x.vide && !(sauter && x.doublon));
    if (!a.length) return toast('Rien à importer');
    if (!confirm(`Importer ${a.length} objet${a.length > 1 ? 's' : ''} ?`)) return;
    const b = document.getElementById('i-go'); b.disabled = true; b.textContent = 'Import en cours…';
    try {
      for (const x of a) if (x.nomS) x.r.serie_id = (await trouverOuCreerSerie(x.r.categorie, x.nomS)).id;
      let n = 0;
      for (let i = 0; i < a.length; i += 100) {
        const { data, error } = await sb.from('objets').insert(a.slice(i, i + 100).map((x) => x.r)).select();
        if (error) throw error; S.objets.push(...data); n += data.length;
      }
      toast(n + ' objet' + (n > 1 ? 's' : '') + ' importé' + (n > 1 ? 's' : ''), 5000); IMPORT = null; location.hash = '#/';
    } catch (e) { erreur(e, 'Import interrompu'); b.disabled = false; b.textContent = 'Importer'; }
  }

  // ------------------------------------------------------------------
  // Démarrage
  // ------------------------------------------------------------------
  let demarre = false;
  sb.auth.onAuthStateChange((evt, session) => {
    const avant = S.session && S.session.user.id;
    S.session = session;
    if (!session) { S.pret = false; S.chargement = null; S.objets = []; S.series = []; S.form = null; }
    if (/access_token=|error_description=/.test(location.hash)) {
      if (/error_description=/.test(location.hash)) setTimeout(() => toast('Lien de connexion expiré ou déjà utilisé : demande-en un nouveau', 6000), 300);
      history.replaceState(null, '', location.pathname + '#/');
    }
    if (!demarre || (session && session.user.id) !== avant) { demarre = true; setTimeout(afficher, 0); }
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
