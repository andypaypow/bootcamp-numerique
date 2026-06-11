---
name: bootcamp-numerique
lastUpdated: 2026-06-11
---

# Bootcamp Numerique - Gosen Academy

## Objectif
Landing page statique avec espace membre. Hebergee sur GitHub Pages avec Supabase pour l'auth et les webhooks.

## Etat Actuel (2026-06-11)
- **Statut** : Landing + espace membre + webhook Cyberschool
- **Stack** : HTML/CSS/JS + Supabase (auth + webhook)
- **Hebergement** : GitHub Pages (repo andypaypow/bootcamp-numerique, branche main)
- **Domaine** : bootcamp.filtreexpert.org (Cloudflare CNAME -> andypaypow.github.io)
- **Supabase** : khwizksacgnwjdvsyqkn (nouveau projet)
- **Font** : DM Sans + JetBrains Mono (Google Fonts)
- **Palette** : Emerald/gold sur dark (#0c0f0c, #00875a accent, #e8a838 gold)

## Sections
1. **Hero + CTA** : Layout asymetrique 60/40, badge, H1, 2 CTA (Moov/Airtel + WhatsApp), stats card
2. **Programme** : 3 cartes (Jour 1 Fondations, Jour 2 Construction, Jour 3 Production)
3. **Tarif + Paiement** : Carte 100K FCFA, boutons Moov Money/Airtel Money, WhatsApp, garantie
4. **FAQ + Contact** : 5 questions accordion, liens WhatsApp + Email
5. **#merci** : Confirmation paiement + connexion par telephone
6. **#espace** : Dashboard membre (programme detaille, checklist, liens, statut)

## Architecture Auth
- **Webhook** : `POST https://khwizksacgnwjdvsyqkn.supabase.co/functions/v1/bootcamp-webhook`
- **Redirection Cyberschool** : `https://bootcamp.filtreexpert.org/#merci`
- **Connexion** : Telephone normalise -> lookup Supabase `inscriptions` + `payments`
- **localStorage** : `bootcamp_phone` + `bootcamp_statut` pour persistance

## Supabase Tables
- `inscriptions` : telephone_normalized, nom_complet, email, statut
- `payments` : inscription_id, telephone_normalized, montant, reference, source, statut
- `webhook_logs` : source, statut, payload, headers, reference, montant, telephone

## Fichiers
| Fichier | Description | Statut |
|---------|-------------|--------|
| index.html | Landing + #merci + #espace + modal | OK |
| css/style.css | Design system + forms + dashboard | OK |
| js/main.js | Scroll reveal, counters, FAQ, navbar | OK |
| js/auth.js | Supabase auth (connexion, verification, deconnexion) | OK |
| sql/001_tables.sql | Creation des tables Supabase | A executer |
| supabase/functions/bootcamp-webhook/index.ts | Edge Function webhook | A deployer |

## Liens
- **Cyberschool Moov** : https://sumb.cyberschool.ga/?productId=dhDw8HwvaoKyeTkJlWG0&operationAccountCode=ACC_6835C458B85FF&maison=moov&amount=100
- **Cyberschool Airtel** : https://sumb.cyberschool.ga/?productId=dhDw8HwvaoKyeTkJlWG0&operationAccountCode=ACC_6835C64624E15&maison=airtel&amount=100
- **WhatsApp** : https://wa.me/214077045354
- **Email** : ericdavy48@gmail.com
- **Webhook callback** : https://bootcamp.filtreexpert.org/#merci

## Historique
- Version Django (branche dev) : Django 4.2 + PostgreSQL + Docker, port VPS 9200
- Migration statique : juin 2026
- VPS nettoye : conteneurs bootcamp supprimes, Nginx config supprimee, port 9200 ferme
- Ajout espace membre + webhook : juin 2026

## Taches Restantes
- [x] Configurer Cloudflare DNS (CNAME -> andypaypow.github.io)
- [x] Nettoyer le VPS (conteneurs Docker, Nginx, port 9200)
- [x] Configurer les URLs Cyberschool
- [x] Remplacer le numero WhatsApp
- [ ] Executer le SQL 001_tables.sql dans Supabase
- [ ] Deployer l'Edge Function bootcamp-webhook
- [ ] Configurer le callback URL Cyberschool -> webhook
- [ ] Activer HTTPS force sur GitHub Pages
- [ ] Tester mobile + desktop