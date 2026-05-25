import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  browserSessionPersistence,
  setPersistence
} from 'firebase/auth';
import firebaseConfig from '@/firebase-applet-config.json';

// Initialize the single Firebase App instance
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Use local session persistence so users stay logged in during their session
setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.warn('Set auth persistence failed:', err);
});

const provider = new GoogleAuthProvider();
// Request standard Drive access to files created by this applet
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Cache the access token securely in memory (never written to localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initializes the authentication listener.
 * Automatically clears or sets the cached token when user signs in or out.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If logged in but token was cleared (e.g., refresh), ask for login or trigger login button
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Executes standard Google Provider popup.
 * Caches and returns credentials.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token from login popup.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Firebase authentication error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Fetch the currently cached access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Sign out from Firebase and clear cached token
 */
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
