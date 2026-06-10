from django.db import models
from django.utils import timezone


class Session(models.Model):
    """Session du bootcamp (ex: 26-28 août, 31 août - 2 septembre)"""
    nom = models.CharField(max_length=200, help_text="Ex: Session 1 — Août 2026")
    date_debut = models.DateField(help_text="Date de début de la session")
    date_fin = models.DateField(help_text="Date de fin de la session")
    places_max = models.PositiveIntegerField(default=5, help_text="Nombre maximum de places")
    prix = models.DecimalField(max_digits=10, decimal_places=0, default=100000,
                               help_text="Prix en FCFA (défaut: 100 000)")
    est_active = models.BooleanField(default=True, help_text="Session visible et ouverte aux inscriptions")
    ordre_affichage = models.PositiveIntegerField(default=0)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date_debut']
        verbose_name = 'Session Bootcamp'
        verbose_name_plural = 'Sessions Bootcamp'

    def __str__(self):
        return f"{self.nom} ({self.date_debut.strftime('%d/%m')} - {self.date_fin.strftime('%d/%m/%Y')})"

    @property
    def places_restantes(self):
        inscriptions_confirmees = self.inscriptions.filter(
            statut__in=['en_attente_paiement', 'confirmee']
        ).count()
        return max(0, self.places_max - inscriptions_confirmees)

    @property
    def est_complete(self):
        return self.places_restantes <= 0

    @property
    def prix_display(self):
        return f"{int(self.prix):,}".replace(',', ' ')


class Inscription(models.Model):
    """Inscription d'une personne au bootcamp"""
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('en_attente_paiement', 'En attente de paiement'),
        ('confirmee', 'Confirmée'),
        ('annulee', 'Annulée'),
        ('remboursee', 'Remboursée'),
    ]

    session = models.ForeignKey(
        Session, on_delete=models.CASCADE,
        related_name='inscriptions'
    )
    nom_complet = models.CharField(max_length=200)
    email = models.EmailField()
    telephone = models.CharField(max_length=50)
    telephone_normalized = models.CharField(
        max_length=20, blank=True, null=True, db_index=True,
        help_text="Téléphone normalisé pour la recherche webhook"
    )
    whatsapp = models.CharField(
        max_length=50, blank=True, null=True,
        help_text="Numéro WhatsApp (peut être différent du téléphone)"
    )
    statut = models.CharField(
        max_length=20, choices=STATUT_CHOICES, default='en_attente'
    )
    notes = models.TextField(blank=True, help_text="Notes internes")
    date_inscription = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_inscription']
        verbose_name = 'Inscription Bootcamp'
        verbose_name_plural = 'Inscriptions Bootcamp'
        indexes = [
            models.Index(fields=['telephone_normalized']),
            models.Index(fields=['email']),
            models.Index(fields=['statut']),
        ]

    def __str__(self):
        return f"{self.nom_complet} - {self.session.nom} ({self.get_statut_display()})"

    def save(self, *args, **kwargs):
        if self.telephone:
            from .utils import normalize_phone
            self.telephone_normalized = normalize_phone(self.telephone)
        super().save(*args, **kwargs)


class PaiementBootcamp(models.Model):
    """Paiement pour le bootcamp via webhook Cyberschool/Moov/Airtel"""
    SOURCE_CHOICES = [
        ('cyberschool', 'Cyberschool'),
        ('moov_money', 'Moov Money'),
        ('airtel_money', 'Airtel Money'),
        ('autre', 'Autre'),
    ]
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('complete', 'Complété'),
        ('echoue', 'Échoué'),
        ('rembourse', 'Remboursé'),
    ]

    inscription = models.ForeignKey(
        Inscription, on_delete=models.CASCADE,
        related_name='paiements'
    )
    source = models.CharField(max_length=50, choices=SOURCE_CHOICES, default='cyberschool')
    montant = models.DecimalField(max_digits=10, decimal_places=0, default=100000)
    devise = models.CharField(max_length=10, default='XAF')
    reference_transaction = models.CharField(max_length=255, unique=True)
    code_paiement = models.CharField(max_length=50, blank=True, null=True)
    telephone = models.CharField(max_length=50, blank=True, null=True)
    telephone_normalized = models.CharField(max_length=20, blank=True, null=True, db_index=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    payload = models.JSONField(default=dict, blank=True)
    headers = models.JSONField(default=dict, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_paiement = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-date_creation']
        verbose_name = 'Paiement Bootcamp'
        verbose_name_plural = 'Paiements Bootcamp'

    def __str__(self):
        return f"Paiement {self.reference_transaction} - {self.get_statut_display()}"


class WebhookLogBootcamp(models.Model):
    """Log de tous les webhooks reçus pour le bootcamp"""
    SOURCE_CHOICES = [
        ('cyberschool', 'Cyberschool'),
        ('moov_money', 'Moov Money'),
        ('airtel_money', 'Airtel Money'),
        ('autre', 'Autre'),
    ]
    STATUT_CHOICES = [
        ('SUCCES', 'Succès'),
        ('ERREUR', 'Erreur'),
        ('EN_ATTENTE', 'En attente'),
    ]

    source = models.CharField(max_length=50, choices=SOURCE_CHOICES, default='cyberschool')
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='EN_ATTENTE')
    payload = models.JSONField(default=dict, blank=True)
    headers = models.JSONField(default=dict, blank=True)
    reference_transaction = models.CharField(max_length=255, blank=True, null=True)
    code_paiement = models.CharField(max_length=50, blank=True, null=True)
    montant = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True)
    fees = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=0, blank=True, null=True)
    telephone = models.CharField(max_length=50, blank=True, null=True)
    telephone_normalized = models.CharField(max_length=20, blank=True, null=True, db_index=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    date_reception = models.DateTimeField(auto_now_add=True)
    date_traitement = models.DateTimeField(blank=True, null=True)
    message_erreur = models.TextField(blank=True, null=True)
    tentatives = models.IntegerField(default=0)
    paiement = models.ForeignKey(
        PaiementBootcamp, on_delete=models.SET_NULL,
        blank=True, null=True, related_name='webhook_logs'
    )

    class Meta:
        ordering = ['-date_reception']
        verbose_name = 'Log Webhook Bootcamp'
        verbose_name_plural = 'Logs Webhooks Bootcamp'

    def __str__(self):
        return f'Webhook {self.source} - {self.reference_transaction or "N/A"}'