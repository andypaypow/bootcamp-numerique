/**
 * Bootcamp 2.0 — Landing page JavaScript
 * - Day tabs (programme)
 * - FAQ accordion
 * - Scroll reveal animations
 * - Navbar scroll effect
 * - Smooth scroll for anchor links
 * - Inscription form (AJAX)
 * - Places remaining polling
 */

// Day tabs
function showDay(n) {
    document.querySelectorAll('.day-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.day-tab').forEach(el => el.classList.remove('active'));
    var dayEl = document.getElementById('day-' + n);
    if (dayEl) dayEl.classList.add('active');
    var tabs = document.querySelectorAll('.day-tab');
    if (tabs[n - 1]) tabs[n - 1].classList.add('active');
}

// FAQ accordion
function toggleFaq(el) {
    var item = el.parentElement;
    var wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(function(i) { i.classList.remove('open'); });
    if (!wasOpen) item.classList.add('open');
}

// Scroll reveal
var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal').forEach(function(el) { observer.observe(el); });

// Navbar scroll effect
window.addEventListener('scroll', function() {
    var navbar = document.querySelector('.navbar');
    var scroll = window.scrollY;
    if (scroll > 100) {
        navbar.style.background = 'rgba(250, 251, 250, 0.98)';
        navbar.style.boxShadow = '0 1px 8px rgba(0,0,0,0.04)';
    } else {
        navbar.style.background = 'rgba(250, 251, 250, 0.92)';
        navbar.style.boxShadow = 'none';
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// === INSCRIPTION FORM (AJAX) ===
(function() {
    var form = document.getElementById('inscription-form');
    var messageEl = document.getElementById('inscription-message');
    var btnSubmit = document.getElementById('btn-submit');

    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Désactiver le bouton
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Envoi en cours...';
        }

        var formData = new FormData(form);

        fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                if (messageEl) {
                    messageEl.className = 'inscription-message success';
                    messageEl.style.display = 'block';
                    messageEl.innerHTML = '<strong>✅ Inscription enregistrée !</strong><br>Redirection vers la page de paiement...';
                }
                form.style.display = 'none';

                // Rediriger vers la page de paiement
                if (data.redirect) {
                    setTimeout(function() {
                        window.location.href = data.redirect;
                    }, 1500);
                }
            } else {
                if (messageEl) {
                    messageEl.className = 'inscription-message error';
                    messageEl.style.display = 'block';
                    var errorMsg = data.message || 'Erreur lors de l\'inscription.';
                    if (data.errors) {
                        errorMsg = Object.values(data.errors).join('<br>');
                    }
                    messageEl.innerHTML = '<strong>❌ ' + errorMsg + '</strong>';
                }
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Réserver ma place';
                }
            }
        })
        .catch(function() {
            if (messageEl) {
                messageEl.className = 'inscription-message error';
                messageEl.style.display = 'block';
                messageEl.innerHTML = '<strong>❌ Erreur réseau. Veuillez réessayer.</strong>';
            }
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Réserver ma place';
            }
        });
    });
})();

// === PLACES REMAINING POLLING ===
(function() {
    var placesUrl = '/api/sessions/places/';

    function updatePlaces() {
        fetch(placesUrl)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data.sessions) return;

                data.sessions.forEach(function(session) {
                    // Mettre à jour les stats du hero
                    var statEl = document.querySelector('.session-stat[data-session-id="' + session.id + '"]');
                    if (statEl) {
                        var numberEl = statEl.querySelector('.number');
                        if (numberEl) {
                            numberEl.textContent = session.places_restantes + '/' + session.places_max;
                        }
                    }

                    // Mettre à jour le compteur de places
                    var placeText = document.querySelector('.places-text[data-session-id="' + session.id + '"]');
                    if (placeText) {
                        if (session.est_complete) {
                            placeText.textContent = 'Complet — ' + session.nom;
                        } else {
                            placeText.textContent = 'Plus que ' + session.places_restantes + ' places — ' + session.nom;
                        }
                    }
                });
            })
            .catch(function() {
                // Silencieux — on réessaiera
            });
    }

    // Polling toutes les 30 secondes
    setInterval(updatePlaces, 30000);

    // Première mise à jour après 10 secondes
    setTimeout(updatePlaces, 10000);
})();