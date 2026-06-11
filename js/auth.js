/* ============================================
   Bootcamp 2.0 — Auth & Espace Membre
   Supabase-based phone authentication
   ============================================ */

const SUPABASE_URL = 'https://khwizksacgnwjdvsyqkn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod2l6a3NhY2dud2pkdnN5cWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDQzOTcsImV4cCI6MjA5Njc4MDM5N30.aJfghLH_f1j6HHbHZfNwxqXSa-kav32sfS1GGaVcCiQ';

let supabase = null;
let currentUser = null;

// Normalise un numero gabonais : +241/00241/241/0XX/XX -> 0XXXXXXXX
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

// Initialiser Supabase
function initSupabase() {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn('Supabase JS not loaded');
  }
}

// Verifier si un numero a un paiement confirme
async function checkPayment(phone) {
  if (!supabase) {
    console.warn('Supabase not initialized');
    return null;
  }

  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  // Chercher dans les inscriptions avec statut confirmee
  const { data: inscription, error: inscError } = await supabase
    .from('inscriptions')
    .select('id, nom_complet, telephone_normalized, statut')
    .eq('telephone_normalized', normalized)
    .maybeSingle();

  if (inscError) {
    console.error('Error fetching inscription:', inscError);
    return null;
  }

  // Chercher dans les payments aussi (si pas trouve dans inscriptions)
  if (!inscription) {
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('id, telephone_normalized, statut, montant, source')
      .eq('telephone_normalized', normalized)
      .eq('statut', 'succes')
      .limit(1);

    if (payError) {
      console.error('Error fetching payments:', payError);
      return null;
    }

    if (payments && payments.length > 0) {
      return { phone: normalized, statut: 'confirmee', source: 'payment' };
    }

    return null;
  }

  if (inscription.statut === 'confirmee' || inscription.statut === 'en_attente_paiement') {
    return {
      phone: normalized,
      nom: inscription.nom_complet,
      statut: inscription.statut,
      source: 'inscription'
    };
  }

  return null;
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
  document.getElementById('espace').style.display = '';
  document.getElementById('merci').style.display = 'none';
  document.getElementById('navEspace').style.display = '';

  // Remplir les infos
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

  // Trigger reveal animations
  document.querySelectorAll('#espace .reveal, #espace .reveal-stagger').forEach(el => {
    el.classList.add('visible');
  });

  // Scroll to espace
  setTimeout(() => {
    document.getElementById('espace').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// Cacher le dashboard
function hideEspace() {
  document.getElementById('espace').style.display = 'none';
  document.getElementById('navEspace').style.display = 'none';
}

// Afficher la section merci
function showMerci() {
  document.getElementById('merci').style.display = '';
  document.querySelectorAll('#merci .reveal, #merci .reveal-stagger').forEach(el => {
    el.classList.add('visible');
  });
  setTimeout(() => {
    document.getElementById('merci').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// Modal connexion
function showModal() {
  document.getElementById('loginModal').style.display = 'flex';
  document.getElementById('login-phone').focus();
}

function hideModal() {
  document.getElementById('loginModal').style.display = 'none';
}

// Afficher un message d'erreur
function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
    el.className = 'form-error';
  }
}

function showSuccess(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
    el.className = 'form-success';
  }
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.style.display = 'none';
}

// Auto-login au chargement si numero en memoire
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
  initSupabase();

  // Hash routing
  const hash = window.location.hash;
  if (hash === '#merci') {
    showMerci();
  } else if (hash === '#espace') {
    showModal();
  }

  // Bouton merci-submit
  const merciSubmit = document.getElementById('merci-submit');
  if (merciSubmit) {
    merciSubmit.addEventListener('click', async () => {
      const phone = document.getElementById('merci-phone').value.trim();
      hideError('merci-error');
      if (!phone) {
        showError('merci-error', 'Veuillez entrer votre numero de telephone.');
        return;
      }
      merciSubmit.disabled = true;
      merciSubmit.textContent = 'Connexion...';
      const success = await login(phone);
      merciSubmit.disabled = false;
      merciSubmit.textContent = 'Acceder a mon espace';
      if (!success) {
        showError('merci-error', 'Aucun paiement trouve pour ce numero. Verifiez le numero utilise lors du paiement.');
      }
    });
  }

  // Bouton login-submit
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
        showError('login-error', 'Aucun paiement trouve pour ce numero. Verifiez le numero utilise lors du paiement.');
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

  // Click overlay to close modal
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