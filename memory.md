---
name: bootcamp-numerique
lastUpdated: 2026-06-10
---

# Bootcamp Numérique — Gosen Academy

## 🎯 Objectif
Application Django complète pour le bootcamp 2.0 : landing page, inscriptions, paiement via webhook Cyberschool, places restantes en temps réel.

## 📊 État Actuel (2026-06-10)
- **Statut** : ✅ Fonctionnel en local (port 9200)
- **Dernière avancée** : Django app complète, Docker OK, DB PostgreSQL OK

## 🌐 Déploiement
- **URL production** : https://bootcamp.filtreexpert.org (Cloudflare → VPS 158.220.96.181:9200)
- **Repo GitHub** : andypaypow/bootcamp-numerique (branches dev + main)
- **Port VPS** : 9200

## 🏗️ Architecture
- **Stack** : Django 4.2 + PostgreSQL 15 + Gunicorn + Nginx + Docker
- **Réseau Docker** : gosen-network (partagé avec GosenFilter)
- **Webhook** : `/webhook/bootcamp/receiver/` (isolé de GosenFilter)
- **Paiement** : Cyberschool (Moov Money, Airtel Money)
- **Domaine** : bootcamp.filtreexpert.org via Cloudflare

## 🔄 Avancées (2026-06-10)
- Refonte design : fond blanc + couleurs gabonaises (vert #009739, jaune #FFD700, bleu #003DA5)
- Structure Django complète : models, vues, templates, admin, forms
- Models : Session, Inscription, PaiementBootcamp, WebhookLogBootcamp
- Vues : landing, inscription (AJAX), paiement, confirmation, API places, webhook
- Templates : base.html, landing.html (avec formulaire), paiement.html, confirmation.html
- Docker dev fonctionnel (port 9200), 2 sessions initiales créées
- Migrations appliquées, superuser créé, API testée

## 📁 Fichiers Critiques
| Fichier | Description | Statut |
|---------|-------------|--------|
| bootcamp_project/settings.py | Config Django | ✅ |
| bootcamp_app/models.py | Session, Inscription, Paiement, WebhookLog | ✅ |
| bootcamp_app/views/ | landing, webhooks, api | ✅ |
| bootcamp_app/templates/ | base, landing, paiement, confirmation | ✅ |
| bootcamp_app/static/ | CSS, JS | ✅ |
| docker-compose.dev.yml | Docker dev | ✅ |
| docker-compose.prod.yml | Docker prod | ✅ |
| Dockerfile | Image Docker | ✅ |
| nginx.conf | Config Nginx production | ✅ |

## ⚠️ Points d'Attention
- **DB Host** : `bootcamp-dev-db` (pas `db`) en dev — conflit DNS sur gosen-network
- **Paiement** : Même logique Cyberschool que GosenFilter mais workflow différent
- **Prix** : Configurable via admin Django (par session)
- **Sessions** : 26-28 août et 31 août - 2 septembre 2026, 5 places max chacune

## 🎯 Tâches Restantes
- [ ] Déployer sur VPS (docker-compose.prod.yml)
- [ ] Configurer Cloudflare DNS pour bootcamp.filtreexpert.org
- [ ] Push sur GitHub (branche dev)
- [ ] Tester le webhook Cyberschool
- [ ] Ajouter numéro WhatsApp réel (placeholder `241XXXXXXXX`)
- [ ] Ajouter preuves sociales / témoignages