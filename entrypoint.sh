#!/bin/bash

# Attendre que la base de données soit prête
while ! nc -z $POSTGRES_HOST 5432 2>/dev/null; do
    echo "En attente de la base de données..."
    sleep 1
done

# Collecter les fichiers statiques
python manage.py collectstatic --noinput 2>/dev/null || true

# Appliquer les migrations
python manage.py migrate --noinput

# Créer le superutilisateur si les variables d'environnement sont définies
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    python manage.py createsuperuser --noinput 2>/dev/null || true
fi

# Créer les sessions initiales si elles n'existent pas
python manage.py shell -c "
from bootcamp_app.models import Session
if Session.objects.count() == 0:
    Session.objects.create(
        nom='Session 1 — Août 2026',
        date_debut='2026-08-26',
        date_fin='2026-08-28',
        places_max=5,
        prix=100000,
        est_active=True,
        ordre_affichage=1,
    )
    Session.objects.create(
        nom='Session 2 — Septembre 2026',
        date_debut='2026-08-31',
        date_fin='2026-09-02',
        places_max=5,
        prix=100000,
        est_active=True,
        ordre_affichage=2,
    )
    print('Sessions initiales créées')
else:
    print('Sessions déjà existantes')
" 2>/dev/null || true

# Lancer le serveur
exec "$@"