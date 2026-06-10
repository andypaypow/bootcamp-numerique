from django.urls import path

from .views import landing, webhooks, api

app_name = 'bootcamp_app'

urlpatterns = [
    # Landing page
    path('', landing.landing_page, name='landing'),
    path('inscription/', landing.inscription_submit, name='inscription'),

    # Pages de paiement et confirmation
    path('paiement/<int:inscription_id>/', landing.paiement_page, name='paiement'),
    path('confirmation/<int:inscription_id>/', landing.confirmation_page, name='confirmation'),

    # API endpoints
    path('api/sessions/places/', api.sessions_places, name='api_sessions_places'),
    path('api/paiement/check/<int:inscription_id>/', api.check_paiement, name='api_check_paiement'),
    path('health/', api.health_check, name='health_check'),

    # Webhook Cyberschool
    path('webhook/bootcamp/receiver/', webhooks.webhook_receiver, name='webhook_receiver'),
]