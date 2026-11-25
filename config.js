// Fill this in once (see اقرأني.md). While apiKey is empty the portal runs in demo mode with sample data.
export const CONFIG = {
  academy: 'أكاديمية صلة',
  // The first admin: the person who signs in with this email becomes the administrator.
  // Use the same email in firestore.rules (function ownerEmail).
  ownerEmail: 'rattelquran476@gmail.com',
  // Paste the web-app config from Firebase console → Project settings → Your apps → SDK setup and configuration.
  firebase: {
    apiKey: 'AIzaSyASiyRbue4AANq0CSBbJDPZF9tD83KpVcE',
    authDomain: 'silah-portal.firebaseapp.com',
    projectId: 'silah-portal',
    storageBucket: 'silah-portal.firebasestorage.app',
    messagingSenderId: '596282595018',
    appId: '1:596282595018:web:4b4ad3751783c77b944633',
  },
  // Firebase App Check (docs/APP_CHECK.md). Empty siteKey = off: the portal behaves exactly as before.
  // siteKey is the PUBLIC reCAPTCHA site key. Never put a secret key or a debug token in this file.
  // provider: 'enterprise' (Google's recommendation for new integrations) or 'v3'.
  appCheck: { siteKey: '', provider: 'enterprise' },
};
