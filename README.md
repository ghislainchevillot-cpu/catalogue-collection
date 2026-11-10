# Catalogue collection

Application web personnelle de catalogue de collection (BD, mangas, livres, musique, jeux, consoles, figurines, pièces, timbres).
Installable sur téléphone (Safari : Partager → Sur l'écran d'accueil) et utilisable sur PC.

Maintenance assurée par Claude.

## Organisation

| Fichier | Rôle |
| --- | --- |
| `index.html`, `style.css`, `app.js` | L'application (écrans, scan, doublons, photos, import/export) |
| `config.js` | Adresse Supabase et clé publique (sans droit d'accès par elle-même) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installation sur l'écran d'accueil |
| `vendor/` | Bibliothèques embarquées : supabase-js 2.119, ZXing 0.21 (lecture des codes-barres), SheetJS 0.18.5 mini (Excel) |
| `supabase/functions/recherche/` | Relais serveur de recherche par code-barres (Open Library, BnF, MusicBrainz, UPCitemdb) |

## Données

Projet Supabase « Catalogue collection » : tables `series` et `objets`, stockage privé `photos`.
Lecture et écriture réservées au compte autorisé (règles d'accès de la base). Le code de ce dépôt est public, pas les données.

## Mise à jour

Toute modification poussée sur `main` est publiée par GitHub Pages. Après un changement de `app.js` ou `style.css`, incrémenter `?v=` dans `index.html` et le nom du cache dans `sw.js`.
