// lib/session.js
// Client-side session storage — clears when the tab closes. Swap for
// httpOnly cookies + middleware if you want stronger XSS resistance.
const KEY = 'vp_session_token';
const USER_KEY = 'vp_session_user';

export function saveSessionToken(token) {
  if (typeof window !== 'undefined') sessionStorage.setItem(KEY, token);
}
export function getSessionToken() {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(KEY);
}
export function clearSessionToken() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(USER_KEY);
  }
}
export function saveSessionUser(user) {
  if (typeof window !== 'undefined') sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getSessionUser() {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
