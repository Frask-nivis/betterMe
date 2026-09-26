document.addEventListener('DOMContentLoaded', async () => {
  const BACKEND_URL = 'https://backend-beta-black-91.vercel.app';
  const button = document.getElementById('googleLoginButton');
  const error = document.getElementById('loginError');
  const params = new URLSearchParams(window.location.search);
  const messages = { google_denied: 'Login Google dibatalkan.', invalid_oauth_state: 'Sesi login tidak valid. Silakan coba lagi.', google_auth_failed: 'Login Google gagal. Silakan coba lagi.' };
  if (messages[params.get('error')]) { error.textContent = messages[params.get('error')]; error.hidden = false; }
  button.href = BACKEND_URL + '/api/auth/google';
  try { const response = await fetch(BACKEND_URL + '/api/auth/me', { credentials: 'include' }); if (response.ok) window.location.replace('index.html'); } catch (err) { console.error('Gagal mengecek session login:', err); }
});
