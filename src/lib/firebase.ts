import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Force account selection & consent when needed
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

// Add Google Drive file scope
SCOPES.forEach((scope) => googleAuthProvider.addScope(scope));

// In-memory token cache (never stored in localStorage/sessionStorage per security rules)
let cachedToken: string | null = null;
let tokenExpiry = 0;
let connectedEmail: string | null = null;

export async function googleSignIn(): Promise<{ token: string | null; email: string | null }> {
  const result = await signInWithPopup(auth, googleAuthProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    cachedToken = credential.accessToken;
    tokenExpiry = Date.now() + 50 * 60 * 1000; // 50 minutes
  }
  connectedEmail = result.user?.email || null;
  return { token: cachedToken, email: connectedEmail };
}

export async function getAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  if (auth.currentUser) {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedToken = credential.accessToken;
      tokenExpiry = Date.now() + 50 * 60 * 1000;
      connectedEmail = result.user?.email || null;
      return cachedToken;
    }
  }
  return null;
}

export function hasValidAccessToken(): boolean {
  return Boolean(cachedToken && Date.now() < tokenExpiry);
}

export function getCachedAccessTokenSync(): string | null {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  return null;
}

export function getConnectedGoogleEmail(): string | null {
  return connectedEmail || auth.currentUser?.email || null;
}

export async function signOutGoogle(): Promise<void> {
  cachedToken = null;
  tokenExpiry = 0;
  connectedEmail = null;
  await signOut(auth);
}

export function initAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user?.email) {
      connectedEmail = user.email;
    }
    callback(user);
  });
}
