from django import forms
from .models import Inscription


class InscriptionForm(forms.ModelForm):
    """Formulaire d'inscription avec protection honeypot."""

    # Honeypot field — les bots le remplissent, les humains non
    website = forms.CharField(required=False, widget=forms.HiddenInput())

    class Meta:
        model = Inscription
        fields = ['nom_complet', 'email', 'telephone', 'whatsapp', 'session']
        widgets = {
            'nom_complet': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Votre nom complet',
                'autocomplete': 'name',
            }),
            'email': forms.EmailInput(attrs={
                'class': 'form-input',
                'placeholder': 'votre@email.com',
                'autocomplete': 'email',
            }),
            'telephone': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': '06 70 45 35 40',
                'autocomplete': 'tel',
                'type': 'tel',
            }),
            'whatsapp': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Numéro WhatsApp (optionnel)',
            }),
            'session': forms.Select(attrs={
                'class': 'form-input',
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Ne montrer que les sessions actives non complètes
        from .models import Session
        self.fields['session'].queryset = Session.objects.filter(
            est_active=True
        ).order_by('ordre_affichage', 'date_debut')
        self.fields['session'].empty_label = 'Choisissez une session'
        self.fields['session'].label = 'Session'
        self.fields['whatsapp'].required = False

    def clean_website(self):
        """Honeypot — si rempli, c'est un bot."""
        value = self.cleaned_data.get('website', '')
        if value:
            raise forms.ValidationError('Spam détecté.')
        return value

    def clean_telephone(self):
        """Normaliser le numéro de téléphone gabonais.
        Accepte les formats: 06XXXXXX, 07XXXXXX, 0XXXXXXX, +241XXXXXXX, etc.
        Au Gabon, les numéros font 8 chiffres (9 avec le 0 initial).
        """
        from .utils import normalize_phone
        telephone = self.cleaned_data.get('telephone', '')
        normalized = normalize_phone(telephone)
        if not normalized or len(normalized) < 8:
            raise forms.ValidationError(
                'Entrez un numéro de téléphone valide (ex: 06 70 45 35 40).'
            )
        return normalized