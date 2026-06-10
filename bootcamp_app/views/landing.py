import json
import logging

from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render, redirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ..models import Session, Inscription
from ..forms import InscriptionForm

logger = logging.getLogger(__name__)


def landing_page(request):
    """Page d'accueil — landing page unique."""
    sessions = Session.objects.filter(
        est_active=True
    ).order_by('ordre_affichage', 'date_debut')

    # Si pas de sessions actives, on affiche quand même la page
    # mais avec un message "Aucune session disponible"
    form = InscriptionForm()

    context = {
        'sessions': sessions,
        'form': form,
        'page_title': 'Bootcamp 2.0 — Formations Numériques',
    }
    return render(request, 'bootcamp_app/landing.html', context)


@require_http_methods(["POST"])
def inscription_submit(request):
    """Soumission du formulaire d'inscription (AJAX)."""
    form = InscriptionForm(request.POST)

    # Vérification honeypot
    if form.data.get('website'):
        # Bot détecté — on retourne une réponse sans erreur pour ne pas alerter
        return JsonResponse({
            'success': True,
            'message': 'Inscription enregistrée.',
            'redirect': '/',
        })

    if not form.is_valid():
        errors = {field: errors[0] for field, errors in form.errors.items()}
        return JsonResponse({
            'success': False,
            'errors': errors,
        }, status=400)

    session = form.cleaned_data['session']

    # Vérifier que la session n'est pas complète
    if session.est_complete:
        return JsonResponse({
            'success': False,
            'message': 'Désolé, cette session est complète. Veuillez choisir une autre session.',
        }, status=409)

    # Vérifier doublon (même téléphone + même session)
    telephone_normalized = form.cleaned_data['telephone']
    if Inscription.objects.filter(
        telephone_normalized=telephone_normalized,
        session=session,
        statut__in=['en_attente', 'en_attente_paiement', 'confirmee']
    ).exists():
        return JsonResponse({
            'success': False,
            'message': 'Vous êtes déjà inscrit(e) pour cette session.',
        }, status=409)

    inscription = form.save(commit=False)
    inscription.telephone_normalized = telephone_normalized
    inscription.statut = 'en_attente_paiement'
    inscription.save()

    logger.info(
        f"Nouvelle inscription: {inscription.nom_complet} "
        f"pour {session.nom} ({inscription.id})"
    )

    return JsonResponse({
        'success': True,
        'message': 'Inscription enregistrée ! Procédez au paiement.',
        'inscription_id': inscription.id,
        'redirect': f'/paiement/{inscription.id}/',
    })


def paiement_page(request, inscription_id):
    """Page de paiement avec liens Cyberschool."""
    inscription = get_object_or_404(Inscription, pk=inscription_id)

    # Si déjà confirmé, rediriger vers confirmation
    if inscription.statut == 'confirmee':
        return redirect('confirmation', inscription_id=inscription.id)

    session = inscription.session

    context = {
        'inscription': inscription,
        'session': session,
        'page_title': f'Paiement — {session.nom}',
        # Les liens de paiement Cyberschool seront construits dans le template
        # avec le prix dynamique de la session
        'prix': session.prix,
    }
    return render(request, 'bootcamp_app/paiement.html', context)


def confirmation_page(request, inscription_id):
    """Page de confirmation après paiement."""
    inscription = get_object_or_404(Inscription, pk=inscription_id)
    session = inscription.session

    context = {
        'inscription': inscription,
        'session': session,
        'page_title': 'Confirmation — Bootcamp 2.0',
    }
    return render(request, 'bootcamp_app/confirmation.html', context)