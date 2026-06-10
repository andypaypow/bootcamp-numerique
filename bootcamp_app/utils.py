import re


def normalize_phone(phone):
    """Normalise un numéro de téléphone gabonais.

    Supprime les espaces, tirets, et préfixes internationaux.
    Convertit les formats suivants en format local :
    +241XXXXXXXX -> 0XXXXXXXX
    00241XXXXXXXX -> 0XXXXXXXX
    241XXXXXXXX -> 0XXXXXXXX
    XXXXXXXX -> 0XXXXXXXX (ajoute le 0 si manquant)

    Retourne le numéro normalisé ou une chaîne vide si invalide.
    """
    if not phone:
        return ''

    # Supprimer les espaces, tirets, points, parenthèses
    cleaned = re.sub(r'[\s\-\.\(\)]+', '', str(phone))

    # Retirer le préfixe +
    if cleaned.startswith('+'):
        cleaned = cleaned[1:]

    # Retirer le préfixe 00241
    if cleaned.startswith('00241'):
        cleaned = '0' + cleaned[5:]
    # Retirer le préfixe 241
    elif cleaned.startswith('241'):
        cleaned = '0' + cleaned[3:]
    # Ajouter le 0 si manquant (numéro local)
    elif not cleaned.startswith('0'):
        cleaned = '0' + cleaned

    return cleaned