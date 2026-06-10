import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone

from ..models import Inscription, PaiementBootcamp, WebhookLogBootcamp
from ..utils import normalize_phone

logger = logging.getLogger(__name__)


def _extract_payload(data):
    """Extraire les infos du payload Cyberschool/Moov/Airtel.

    Même logique que GosenFilter — le webhook reçoit un JSON avec :
    - reference_transaction (ou transaction_id)
    - telephone / phone_number
    - montant / amount
    - code_paiement (status code)
    - source (moov, airtel, etc.)
    """
    # Champs possibles selon les différentes versions de l'API Cyberschool
    reference = (
        data.get('reference_transaction')
        or data.get('transaction_id')
        or data.get('external_transaction_id')
        or data.get('ref')
        or ''
    )

    telephone = (
        data.get('telephone')
        or data.get('phone_number')
        or data.get('phone')
        or data.get('msisdn')
        or ''
    )

    montant = data.get('montant') or data.get('amount') or data.get('amount_paid') or 0

    # Convertir le montant en nombre
    try:
        montant = float(montant)
    except (ValueError, TypeError):
        montant = 0

    code_paiement = (
        data.get('code_paiement')
        or data.get('status_code')
        or data.get('status')
        or data.get('code')
        or ''
    )

    source = (
        data.get('source')
        or data.get('operator')
        or data.get('provider')
        or data.get('channel')
        or ''
    )

    # Devise
    devise = data.get('devise') or data.get('currency') or 'XAF'

    return {
        'reference': reference,
        'telephone': telephone,
        'montant': montant,
        'code_paiement': str(code_paiement),
        'source': source.lower() if source else '',
        'devise': devise,
    }


@csrf_exempt
@require_http_methods(["POST"])
def webhook_receiver(request):
    """Point d'entrée webhook pour les paiements Cyberschool.

    Flux :
    1. Cyberschool envoie un POST avec le payload de paiement
    2. On log le payload brut dans WebhookLogBootcamp
    3. On extrait les infos (téléphone, montant, référence)
    4. On normalise le numéro de téléphone
    5. On cherche une Inscription correspondante (en_attente_paiement)
    6. On crée un PaiementBootcamp
    7. Si le paiement est valide → on confirme l'Inscription
    """
    # Capturer le payload brut
    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        logger.warning("Webhook reçu avec payload invalide")
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    headers_dict = dict(request.headers)
    raw_body = request.body.decode('utf-8', errors='replace')

    # Extraire les infos
    info = _extract_payload(payload)
    telephone_normalized = normalize_phone(info['telephone'])

    # Logger le webhook
    log_entry = WebhookLogBootcamp.objects.create(
        source=info['source'],
        reference_transaction=info['reference'],
        telephone=info['telephone'],
        telephone_normalized=telephone_normalized,
        montant=info['montant'],
        code_paiement=info['code_paiement'],
        devise=info['devise'],
        payload=raw_body,
        headers=json.dumps(headers_dict),
        statut='recu',
    )

    logger.info(
        f"Webhook bootcamp reçu: ref={info['reference']}, "
        f"tel={telephone_normalized}, montant={info['montant']}, "
        f"source={info['source']}, code={info['code_paiement']}"
    )

    # Chercher une inscription correspondante
    # Le téléphone normalisé doit matcher une inscription en attente de paiement
    inscription = None
    if telephone_normalized:
        inscription = Inscription.objects.filter(
            telephone_normalized=telephone_normalized,
            statut='en_attente_paiement',
        ).order_by('-date_inscription').first()

    if not inscription and telephone_normalized:
        # Essayer aussi avec le préfixe sans le 0 initial (ex: 6XXXXXXX)
        alt_phone = telephone_normalized
        if alt_phone.startswith('0'):
            alt_phone = alt_phone[1:]
        if alt_phone:
            inscription = Inscription.objects.filter(
                telephone_normalized__endswith=alt_phone,
                statut='en_attente_paiement',
            ).order_by('-date_inscription').first()

    # Créer l'entrée paiement
    paiement = PaiementBootcamp.objects.create(
        inscription=inscription,
        source=info['source'],
        montant=info['montant'],
        reference_transaction=info['reference'],
        code_paiement=info['code_paiement'],
        telephone=info['telephone'],
        telephone_normalized=telephone_normalized,
        devise=info['devise'],
        payload=raw_body,
        headers=json.dumps(headers_dict),
        statut='en_attente',
    )

    # Déterminer si le paiement est valide
    # Codes Cyberschool : 0 ou "0" = succès, autres = échec
    paiement_valide = info['code_paiement'] in ('0', 0, '00', 'SUCCESS', 'success')

    if paiement_valide and inscription:
        # Confirmer l'inscription
        inscription.statut = 'confirmee'
        inscription.save()

        paiement.statut = 'valide'
        paiement.save()

        log_entry.statut = 'traite'
        log_entry.save()

        logger.info(
            f"Inscription confirmée: {inscription.nom_complet} "
            f"({inscription.id}) pour {inscription.session.nom}"
        )
    elif inscription:
        # Paiement échoué mais inscription trouvée
        paiement.statut = 'echoue'
        paiement.save()

        log_entry.statut = 'echoue'
        log_entry.save()

        logger.warning(
            f"Paiement échoué pour inscription {inscription.id}: "
            f"code={info['code_paiement']}"
        )
    else:
        # Pas d'inscription trouvée pour ce téléphone
        log_entry.statut = 'non_trouve'
        log_entry.save()

        logger.warning(
            f"Aucune inscription trouvée pour le téléphone "
            f"{telephone_normalized} (original: {info['telephone']})"
        )

    return JsonResponse({
        'status': 'ok',
        'inscription_trouvee': inscription is not None,
        'paiement_valide': paiement_valide,
    })