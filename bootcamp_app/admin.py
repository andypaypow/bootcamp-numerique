from django.contrib import admin
from .models import Session, Inscription, PaiementBootcamp, CyberschoolConfig, WebhookLogBootcamp


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ['nom', 'date_debut', 'date_fin', 'places_max', 'prix', 'est_active', 'places_restantes_custom']
    list_filter = ['est_active']
    search_fields = ['nom']
    ordering = ['date_debut']
    readonly_fields = ['places_restantes_custom', 'est_complete_custom', 'date_creation', 'date_modification']

    def places_restantes_custom(self, obj):
        return f"{obj.places_restantes}/{obj.places_max}"
    places_restantes_custom.short_description = 'Places restantes/max'

    def est_complete_custom(self, obj):
        return obj.est_complete
    est_complete_custom.short_description = 'Complète'
    est_complete_custom.boolean = True


@admin.register(Inscription)
class InscriptionAdmin(admin.ModelAdmin):
    list_display = ['nom_complet', 'session', 'telephone', 'email', 'statut', 'date_inscription']
    list_filter = ['statut', 'session']
    search_fields = ['nom_complet', 'telephone', 'email', 'telephone_normalized']
    ordering = ['-date_inscription']
    readonly_fields = ['telephone_normalized', 'date_inscription', 'date_modification']

    actions = ['valider_inscriptions', 'annuler_inscriptions']

    def valider_inscriptions(self, request, queryset):
        for inscription in queryset.filter(statut='en_attente_paiement'):
            inscription.statut = 'confirmee'
            inscription.save()
        self.message_user(request, f'{queryset.count()} inscription(s) validée(s)')
    valider_inscriptions.short_description = 'Valider les inscriptions sélectionnées'

    def annuler_inscriptions(self, request, queryset):
        queryset.update(statut='annulee')
        self.message_user(request, f'{queryset.count()} inscription(s) annulée(s)')
    annuler_inscriptions.short_description = 'Annuler les inscriptions sélectionnées'


@admin.register(PaiementBootcamp)
class PaiementBootcampAdmin(admin.ModelAdmin):
    list_display = ['reference_transaction', 'inscription', 'montant', 'devise', 'source', 'statut', 'date_creation']
    list_filter = ['statut', 'source']
    search_fields = ['reference_transaction', 'telephone', 'telephone_normalized']
    ordering = ['-date_creation']
    readonly_fields = ['date_creation', 'date_paiement']


@admin.register(CyberschoolConfig)
class CyberschoolConfigAdmin(admin.ModelAdmin):
    list_display = ['nom', 'est_active', 'lien_moov_money_court', 'lien_airtel_money_court', 'date_modification']
    list_filter = ['est_active']
    readonly_fields = ['date_creation', 'date_modification']
    fieldsets = (
        ('Configuration générale', {
            'fields': ('nom', 'est_active')
        }),
        ('Liens de paiement Cyberschool (Libertis)', {
            'description': 'Collez ici les URLs de paiement générées depuis votre dashboard Cyberschool/Libertis. '
                           'Ces liens seront affichés sur la page de paiement comme boutons.',
            'fields': ('lien_moov_money', 'lien_airtel_money')
        }),
        ('Numéros de paiement directs (optionnel)', {
            'description': 'Si vous n\'avez pas de liens Cyberschool, indiquez les numéros Moov/Airtel '
                           'pour que les participants envoient l\'argent directement.',
            'fields': ('numero_moov', 'numero_airtel')
        }),
        ('Instructions supplémentaires', {
            'description': 'Texte affiché sur la page de paiement en plus des liens/numéros.',
            'fields': ('instructions_paiement',)
        }),
        ('Historique', {
            'fields': ('date_creation', 'date_modification')
        }),
    )

    def lien_moov_money_court(self, obj):
        if obj.lien_moov_money:
            return obj.lien_moov_money[:50] + '...'
        return '—'
    lien_moov_money_court.short_description = 'Lien Moov Money'

    def lien_airtel_money_court(self, obj):
        if obj.lien_airtel_money:
            return obj.lien_airtel_money[:50] + '...'
        return '—'
    lien_airtel_money_court.short_description = 'Lien Airtel Money'


@admin.register(WebhookLogBootcamp)
class WebhookLogBootcampAdmin(admin.ModelAdmin):
    list_display = ['source', 'reference_transaction', 'telephone', 'montant', 'code_paiement', 'statut', 'date_reception']
    list_filter = ['statut', 'source']
    search_fields = ['reference_transaction', 'telephone', 'telephone_normalized']
    ordering = ['-date_reception']
    readonly_fields = ['payload', 'headers', 'date_reception', 'date_traitement']