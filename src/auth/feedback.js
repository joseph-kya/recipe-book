// Checks and doc shapes for "send feedback" and "suggest a recipe".
// Pure (no Firebase, no DOM) so tests can import it. The limits mirror
// firestore.rules; the sync chunk adds uid and createdAt when it writes.

export const LIMITS = { text: 2000, url: 500, note: 500, route: 200 };
export const LANGS = ['en', 'de', 'fr'];
export const COLLECTIONS = { feedback: 'feedback', suggestion: 'suggestions' };

const SCHEME_RE = /^https?:\/\//i;
// Control characters never belong in a one-line field.
const CONTROL_RE = /[\u0000-\u001f\u007f]/g;

const str = (v) => (typeof v === 'string' ? v : '');
const langOf = (lang) => (LANGS.includes(lang) ? lang : 'en');

// Route is a hint, not user content: trimmed, flattened and cut to fit.
export function cleanRoute(route) {
  return str(route).replace(CONTROL_RE, ' ').trim().slice(0, LIMITS.route);
}

// '' when fine, else an error key (copy lives in src/auth/feedback-i18n.js).
export function urlError(raw) {
  const url = str(raw).trim();
  if (!url) return 'urlEmpty';
  if (url.length > LIMITS.url) return 'urlTooLong';
  if (!SCHEME_RE.test(url) || /\s/.test(url)) return 'urlInvalid';
  try {
    const { hostname } = new URL(url);
    if (!hostname || (!hostname.includes('.') && hostname !== 'localhost')) return 'urlInvalid';
  } catch {
    return 'urlInvalid';
  }
  return '';
}

// The rules match a lowercase scheme, so "HTTPS://" is stored as "https://".
export const cleanUrl = (raw) => str(raw).trim().replace(SCHEME_RE, (s) => s.toLowerCase());

// -> { errors: {field: key}, doc } ; doc is null while there are errors.
export function checkFeedback({ text, route, lang }) {
  const body = str(text).trim();
  const errors = {};
  if (!body) errors.text = 'textEmpty';
  else if (body.length > LIMITS.text) errors.text = 'textTooLong';
  if (Object.keys(errors).length) return { errors, doc: null };
  return { errors, doc: { type: 'feedback', text: body, route: cleanRoute(route), lang: langOf(lang) } };
}

export function checkSuggestion({ url, note, route, lang }) {
  const errors = {};
  const u = urlError(url);
  if (u) errors.url = u;
  const n = str(note).trim();
  if (n.length > LIMITS.note) errors.note = 'noteTooLong';
  if (Object.keys(errors).length) return { errors, doc: null };
  return {
    errors,
    doc: { type: 'suggestion', url: cleanUrl(url), note: n, route: cleanRoute(route), lang: langOf(lang) },
  };
}
