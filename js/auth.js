/* ============================================
   Bootcamp 2.0 — Auth & Espace Membre
   API Express backend
   ============================================ */

const API_URL = 'https://bootcamp-api.filtreexpert.org';
const CYBERSCHOOL_MOOV = 'https://sumb.cyberschool.ga/?productId=dhDw8HwvaoKyeTkJlWG0&operationAccountCode=ACC_6835C458B85FF&maison=moov&amount=100';
const CYBERSCHOOL_AIRTEL = 'https://sumb.cyberschool.ga/?productId=dhDw8HwvaoKyeTkJlWG0&operationAccountCode=ACC_6835C64624E15&maison=airtel&amount=100';

let currentUser = null;
let merciCheckInterval = null;

// Normalise un numero gabonais
function normalizePhone(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+241')) cleaned = cleaned.slice(4);
  else if (cleaned.startsWith('00241')) cleaned = cleaned.slice(5);
  else if (cleaned.startsWith('241')) cleaned = cleaned.slice(3);
  if (cleaned.length === 8 && !cleaned.startsWith('0')) cleaned = '0' + cleaned;
  if (/^0\d{8}$/.test(cleaned)) return cleaned;
  return cleaned || null;
}

// Verifier si un numero a un paiement confirme
async function checkPayment(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  try {
    const res = await fetch(`${API_URL}/api/check?phone=${encodeURIComponent(normalized)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.found) {
      return {
        phone: data.telephone || normalized,
        nom: data.nom || null,
        statut: data.statut || 'confirmee',
        montant: data.montant || null,
        source: data.source || null,
      };
    }
    return null;
  } catch (err) {
    console.error('Error checking payment:', err);
    return null;
  }
}

// Connexion
async function login(phone) {
  const result = await checkPayment(phone);
  if (result) {
    currentUser = result;
    localStorage.setItem('bootcamp_phone', result.phone);
    localStorage.setItem('bootcamp_statut', result.statut || 'confirmee');
    showEspace(result);
    hideModal();
    return true;
  }
  return false;
}

// Deconnexion
function logout() {
  currentUser = null;
  localStorage.removeItem('bootcamp_phone');
  localStorage.removeItem('bootcamp_statut');
  hideEspace();
}

// Afficher le dashboard
function showEspace(data) {
  // Arreter le polling
  if (merciCheckInterval) {
    clearInterval(merciCheckInterval);
    merciCheckInterval = null;
  }

  document.getElementById('espace').style.display = '';
  document.getElementById('merci').style.display = 'none';
  document.getElementById('navEspace').style.display = '';

  const welcomeEl = document.getElementById('espace-welcome');
  const phoneEl = document.getElementById('espace-phone');
  const statutEl = document.getElementById('espace-statut');

  if (data.nom) {
    welcomeEl.textContent = 'Bienvenue, ' + data.nom + ' !';
  } else {
    welcomeEl.textContent = 'Bienvenue !';
  }

  if (phoneEl) phoneEl.textContent = data.phone;
  if (statutEl) {
    statutEl.textContent = data.statut === 'confirmee' ? 'Confirme' : 'En attente';
    statutEl.className = 'status-value' + (data.statut === 'confirmee' ? ' confirmed' : '');
  }

  document.querySelectorAll('#espace .reveal, #espace .reveal-stagger').forEach(el => {
    el.classList.add('visible');
  });

  setTimeout(() => {
    document.getElementById('espace').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// Cacher le dashboard
function hideEspace() {
  document.getElementById('espace').style.display = 'none';
  document.getElementById('navEspace').style.display = 'none';
}

// Afficher la section merci + auto-check
function showMerci() {
  document.getElementById('merci').style.display = '';
  document.querySelectorAll('#merci .reveal, #merci .reveal-stagger').forEach(el => {
    el.classList.add('visible');
  });

  // Pre-remplir avec le numero stocke
  const savedPhone = localStorage.getItem('bootcamp_phone');
  if (savedPhone) {
    const merciPhone = document.getElementById('merci-phone');
    if (merciPhone) merciPhone.value = savedPhone;
  }

  // Auto-check si on a un numero
  const phoneToCheck = localStorage.getItem('bootcamp_pay_phone') || savedPhone;
  if (phoneToCheck) {
    const merciPhone = document.getElementById('merci-phone');
    if (merciPhone && !merciPhone.value) merciPhone.value = phoneToCheck;
    startMerciPolling(phoneToCheck);
  }

  setTimeout(() => {
    document.getElementById('merci').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// Polling automatique sur la page merci
function startMerciPolling(phone) {
  const merciSubmit = document.getElementById('merci-submit');
  const merciError = document.getElementById('merci-error');

  if (merciError) {
    merciError.style.display = 'block';
    merciError.className = 'form-success';
    merciError.textContent = 'Verification du paiement en cours...';
  }

  // Premier check immediat
  checkPayment(phone).then(result => {
    if (result) {
      login(phone);
      return;
    }
  });

  // Polling toutes les 5 secondes
  let attempts = 0;
  const maxAttempts = 24; // 2 minutes max

  merciCheckInterval = setInterval(async () => {
    attempts++;
    const result = await checkPayment(phone);
    if (result) {
      clearInterval(merciCheckInterval);
      merciCheckInterval = null;
      login(phone);
    } else if (attempts >= maxAttempts) {
      clearInterval(merciCheckInterval);
      merciCheckInterval = null;
      if (merciError) {
        merciError.style.display = 'block';
        merciError.className = 'form-error';
        merciError.textContent = 'Paiement pas encore detecte. Verifiez le numero ou reessayez dans quelques minutes.';
      }
    }
  }, 5000);
}

// Modal connexion
function showModal() {
  document.getElementById('loginModal').style.display = 'flex';
  document.getElementById('login-phone').focus();
}

function hideModal() {
  document.getElementById('loginModal').style.display = 'none';
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
    el.className = 'form-error';
  }
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.style.display = 'none';
}

// Auto-login au chargement
async function autoLogin() {
  const savedPhone = localStorage.getItem('bootcamp_phone');
  if (savedPhone) {
    const result = await checkPayment(savedPhone);
    if (result) {
      currentUser = result;
      showEspace(result);
    } else {
      localStorage.removeItem('bootcamp_phone');
      localStorage.removeItem('bootcamp_statut');
    }
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash;
  if (hash === '#merci') {
    showMerci();
  } else if (hash === '#espace') {
    showModal();
  }

  // === Boutons de paiement : stocker le numero avant redirection ===
  const payPhone = document.getElementById('pay-phone');
  const btnMoov = document.getElementById('btn-moov');
  const btnAirtel = document.getElementById('btn-airtel');

  if (btnMoov) {
    btnMoov.addEventListener('click', (e) => {
      e.preventDefault();
      const phone = payPhone ? payPhone.value.trim() : '';
      if (phone) {
        localStorage.setItem('bootcamp_pay_phone', normalizePhone(phone) || phone);
      }
      window.open(CYBERSCHOOL_MOOV, '_blank');
    });
  }

  if (btnAirtel) {
    btnAirtel.addEventListener('click', (e) => {
      e.preventDefault();
      const phone = payPhone ? payPhone.value.trim() : '';
      if (phone) {
        localStorage.setItem('bootcamp_pay_phone', normalizePhone(phone) || phone);
      }
      window.open(CYBERSCHOOL_AIRTEL, '_blank');
    });
  }

  // === Page Merci : soumission manuelle ===
  const merciSubmit = document.getElementById('merci-submit');
  if (merciSubmit) {
    merciSubmit.addEventListener('click', async () => {
      const phone = document.getElementById('merci-phone').value.trim();
      hideError('merci-error');
      if (!phone) {
        showError('merci-error', 'Veuillez entrer votre numero de telephone.');
        return;
      }
      localStorage.setItem('bootcamp_pay_phone', normalizePhone(phone) || phone);
      merciSubmit.disabled = true;
      merciSubmit.textContent = 'Connexion...';
      const success = await login(phone);
      merciSubmit.disabled = false;
      merciSubmit.textContent = 'Acceder a mon espace';
      if (!success) {
        // Commencer le polling
        startMerciPolling(phone);
      }
    });
  }

  // === Modal connexion ===
  const loginSubmit = document.getElementById('login-submit');
  if (loginSubmit) {
    loginSubmit.addEventListener('click', async () => {
      const phone = document.getElementById('login-phone').value.trim();
      hideError('login-error');
      if (!phone) {
        showError('login-error', 'Veuillez entrer votre numero de telephone.');
        return;
      }
      loginSubmit.disabled = true;
      loginSubmit.textContent = 'Connexion...';
      const success = await login(phone);
      loginSubmit.disabled = false;
      loginSubmit.textContent = 'Connexion';
      if (!success) {
        showError('login-error', 'Aucun paiement trouve pour ce numero.');
      }
    });
  }

  // Bouton logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // Modal close
  const modalClose = document.getElementById('modalClose');
  if (modalClose) {
    modalClose.addEventListener('click', hideModal);
  }

  const modalOverlay = document.getElementById('loginModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) hideModal();
    });
  }

  // Nav espace button
  const navEspace = document.getElementById('navEspace');
  if (navEspace) {
    navEspace.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentUser) {
        document.getElementById('espace').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        showModal();
      }
    });
  }

  // Auto-login
  autoLogin();
});