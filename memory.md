---
name: bootcamp-numerique
lastUpdated: 2026-06-11
---

# Bootcamp Numerique - Gosen Academy

## Objectif
Landing page statique pour le Bootcamp 2.0. Hebergee sur GitHub Pages avec domaine personnalise bootcamp.filtreexpert.org.

## Etat Actuel (2026-06-11)
- **Statut** : Refonte complete (Django -> statique)
- **Stack** : HTML/CSS/JS pur, zero dependance, zero build
- **Hebergement** : GitHub Pages (repo andypaypow/bootcamp-numerique, branche main)
- **Domaine** : bootcamp.filtreexpert.org (a configurer : Cloudflare CNAME -> andypaypow.github.io)
- **Font** : DM Sans + JetBrains Mono (Google Fonts)
- **Palette** : Emerald/gold sur dark (#0c0f0c, #00875a accent, #e8a838 gold)

## Sections (4)
1. **Hero + CTA** : Layout asymetrique 60/40, badge, H1, 2 CTA (Cyberschool + WhatsApp), stats card
2. **Programme** : 3 cartes (Jour 1 Fondations, Jour 2 Construction, Jour 3 Production)
3. **Tarif + Paiement** : Carte 100K FCFA, boutons Cyberschool/WhatsApp, badges Moov/Airtel Money, garantie
4. **FAQ + Contact** : 5 questions accordion, liens WhatsApp + Email

## Fichiers
| Fichier | Description | Statut |
|---------|-------------|--------|
| index.html | Page unique, 4 sections | OK |
| css/style.css | Design system complet | OK |
| js/main.js | Scroll reveal, counters, FAQ, navbar | OK |
| CNAME | bootcamp.filtreexpert.org | OK |
| .nojekyll | Empeche Jekyll | OK |

## Liens
- **Cyberschool** : URL placeholder (href="#CYBERSCHOOL_URL")
- **WhatsApp** : https://wa.me/241XXXXXXXX (a remplacer)
- **Email** : ericdavy48@gmail.com

## Historique
- Version Django (branche dev) : Django 4.2 + PostgreSQL + Docker, port VPS 9200
- Migration statique : juin 2026

## Taches Restantes
- [ ] Configurer Cloudflare DNS (CNAME -> andypaypow.github.io)
- [ ] Nettoyer le VPS (conteneurs Docker, Nginx, port 9200)
- [ ] Configurer l'URL Cyberschool reelle
- [ ] Remplacer le numero WhatsApp placeholder
- [ ] Tester mobile + desktop