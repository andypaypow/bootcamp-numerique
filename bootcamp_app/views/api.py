import json
import logging

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods

from ..models import Session, Inscription

logger = logging.getLogger(__name__)


def health_check(request):
    """Endpoint de santé pour le monitoring."""
    return JsonResponse({'status': 'ok', 'service': 'bootcamp'})


@require_http_methods(["GET"])
def sessions_places(request):
    """API — Places restantes pour toutes les sessions actives.

    Retourne un JSON avec les sessions actives et le nombre de places restantes.
    Utilisé par le polling JavaScript sur la landing page.
    """
    sessions = Session.objects.filter(
        est_active=True
    ).order_by('ordre_affichage', 'date_debut')

    data = []
    for session in sessions:
        data.append({
            'id': session.id,
            'nom': session.nom,
            'date_debut': session.date_debut.strftime('%d/%m/%Y'),
            'date_fin': session.date_fin.strftime('%d/%m/%Y'),
            'places_max': session.places_max,
            'places_restantes': session.places_restantes,
            'est_complete': session.est_complete,
            'prix': str(session.prix),
        })

    return JsonResponse({'sessions': data})


@require_http_methods(["GET"])
def check_paiement(request, inscription_id):
    """API — Vérifier le statut de paiement d'une inscription.

    Utilisé par le polling JavaScript sur la page de paiement.
    Le client polling toutes les 5 secondes pour savoir si le paiement est confirmé.
    """
    inscription = get_object_or_404(Inscription, pk=inscription_id)

    return JsonResponse({
        'inscription_id': inscription.id,
        'statut': inscription.statut,
        'est_confirmee': inscription.statut == 'confirmee',
        'session_nom': inscription.session.nom,
    })