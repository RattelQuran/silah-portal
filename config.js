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
};
