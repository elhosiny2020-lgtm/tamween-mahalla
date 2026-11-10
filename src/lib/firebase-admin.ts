import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

let firebaseConfig: any = {};
try {
  const require = createRequire(import.meta.url);
  firebaseConfig = require('../../firebase-applet-config.json');
} catch {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.error('Failed to load firebase-applet-config.json:', err);
  }
}

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId || 'knitted-zenith-5thv3',
  });
}

export const adminAuth = getAuth();
