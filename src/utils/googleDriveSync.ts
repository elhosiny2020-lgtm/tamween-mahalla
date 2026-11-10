import { AppState, mergeStates } from '../storage';
import {
  getAccessToken,
  getCachedAccessTokenSync,
  googleSignIn,
  getConnectedGoogleEmail,
} from '../lib/firebase';

export const DRIVE_MAIN_BACKUP_FILENAME = 'tamween_mahalla_database_backup.json';

export interface DriveSyncResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  email?: string;
  mergedState?: AppState;
  addedBakeriesCount?: number;
  addedDebtsCount?: number;
  timestamp: string;
  message: string;
}

export interface DriveBackupFileItem {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
}

// Track last sync metadata for UI display
let lastDriveSyncInfo: {
  timestamp: string;
  fileId: string;
  fileName: string;
  email: string;
  status: 'idle' | 'syncing' | 'synced' | 'error';
  message: string;
} = {
  timestamp: '',
  fileId: '',
  fileName: DRIVE_MAIN_BACKUP_FILENAME,
  email: 'ELHOSINY2020@gmail.com',
  status: 'idle',
  message: '',
};

export function getLastDriveSyncInfo() {
  return lastDriveSyncInfo;
}

async function ensureDriveAccessToken(interactive: boolean = true): Promise<string> {
  const syncToken = getCachedAccessTokenSync();
  if (syncToken) return syncToken;

  if (!interactive) {
    throw new Error('NO_ACTIVE_TOKEN');
  }

  const existing = await getAccessToken();
  if (existing) return existing;

  const signedIn = await googleSignIn();
  if (!signedIn.token) {
    throw new Error('لم يتم منح صلاحية الوصول إلى Google Drive.');
  }
  return signedIn.token;
}

/**
 * List JSON backup files stored in Google Drive (created/opened by this app via drive.file scope)
 */
export async function listGoogleDriveJsonBackups(
  interactive: boolean = true
): Promise<DriveBackupFileItem[]> {
  const token = await ensureDriveAccessToken(interactive);
  const query = encodeURIComponent(
    "mimeType = 'application/json' and trashed = false"
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=25&fields=files(id,name,modifiedTime,size,webViewLink)`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`فشل جلب قائمة ملفات Google Drive (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return Array.isArray(data.files) ? data.files : [];
}

/**
 * Download a specific JSON file's content from Google Drive by fileId
 */
export async function downloadGoogleDriveFileJson(
  fileId: string,
  interactive: boolean = false
): Promise<Record<string, unknown> | null> {
  const token = await ensureDriveAccessToken(interactive);
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    return null;
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Extract Partial<AppState> from any flexible JSON structure (full backup wrapper, direct state, or raw arrays)
 */
export function extractAppStateFromArbitraryJson(parsed: unknown): Partial<AppState> | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  if (obj.data && typeof obj.data === 'object') {
    return obj.data as Partial<AppState>;
  }
  if (obj.state && typeof obj.state === 'object') {
    return obj.state as Partial<AppState>;
  }
  if (
    Array.isArray(obj.bakeries) ||
    Array.isArray(obj.debts) ||
    Array.isArray(obj.villages) ||
    Array.isArray(obj.users)
  ) {
    return obj as Partial<AppState>;
  }
  if (Array.isArray(parsed)) {
    const first = parsed[0] as Record<string, unknown> | undefined;
    if (first && ('bakeryOwnerName' in first || 'insuranceQuota' in first)) {
      return { bakeries: parsed as AppState['bakeries'] };
    }
    if (first && ('violationAmount' in first || 'netRemainingDebt' in first)) {
      return { debts: parsed as AppState['debts'] };
    }
  }
  return null;
}

/**
 * Upload and save JSON backup directly to Google Drive.
 * First checks if a main backup file already exists on Google Drive; if it does,
 * downloads and additively merges it with currentState so NO data is ever deleted or lost,
 * then updates the file on Google Drive (and optionally creates a dated snapshot).
 */
export async function uploadAndSyncJsonToGoogleDrive(
  currentState: AppState,
  options?: {
    interactive?: boolean;
    createSnapshotCopy?: boolean;
    customFileName?: string;
  }
): Promise<DriveSyncResult> {
  const interactive = options?.interactive ?? true;
  const targetFileName = options?.customFileName || DRIVE_MAIN_BACKUP_FILENAME;
  const nowStr = new Date().toLocaleString('ar-EG');

  lastDriveSyncInfo = {
    ...lastDriveSyncInfo,
    status: 'syncing',
    message: 'جاري المزامنة والرفع المباشر إلى Google Drive...',
  };

  const token = await ensureDriveAccessToken(interactive);
  const email =
    getConnectedGoogleEmail() ||
    currentState.systemConfig?.gmailEmail ||
    'ELHOSINY2020@gmail.com';

  // 1. Check existing files on Google Drive so we can merge additively before saving
  const existingFiles = await listGoogleDriveJsonBackups(interactive);
  const mainFile = existingFiles.find((f) => f.name === targetFileName) || existingFiles[0];

  let mergedState: AppState = {
    ...currentState,
    systemConfig: {
      ...currentState.systemConfig,
      gmailEmail: email,
      googleDriveAutoSync: true,
    },
  };

  let addedBakeriesCount = 0;
  let addedDebtsCount = 0;

  if (mainFile) {
    const remoteJson = await downloadGoogleDriveFileJson(mainFile.id, false);
    const remoteState = extractAppStateFromArbitraryJson(remoteJson);
    if (remoteState) {
      const beforeBakeries = mergedState.bakeries.length;
      const beforeDebts = mergedState.debts.length;
      // Merge remote onto current AND current onto remote so newest edits win and ALL unique records from both are kept!
      const combined = mergeStates(remoteState as AppState, mergedState);
      mergedState = mergeStates(mergedState, combined);
      addedBakeriesCount = Math.max(0, mergedState.bakeries.length - beforeBakeries);
      addedDebtsCount = Math.max(0, mergedState.debts.length - beforeDebts);
    }
  }

  // 2. Build the JSON payload
  const backupPayload = {
    version: '6.0-GOOGLE-DRIVE-DIRECT',
    exportedAt: new Date().toISOString(),
    exportedAtArabic: nowStr,
    gmailAccount: email,
    organization: 'مديرية التموين والتجارة الداخلية بالغربية - إدارة تموين مركز المحلة الكبرى',
    summary: {
      bakeriesCount: mergedState.bakeries.length,
      debtsCount: mergedState.debts.length,
      villagesCount: mergedState.villages.length,
      usersCount: mergedState.users.length,
    },
    data: {
      ...mergedState,
      currentUser: null,
    },
  };

  const jsonString = JSON.stringify(backupPayload, null, 2);

  // Helper to create or update a file on Google Drive using multipart upload
  const uploadMultipart = async (fileName: string, existingFileId?: string) => {
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      description: `نسخة احتياطية لمنظومة إدارة تموين مركز المحلة الكبرى (${nowStr}) - عدد المخابز: ${mergedState.bakeries.length} - عدد المديونيات: ${mergedState.debts.length}`,
    };

    const boundary = '-------TamweenDriveBoundary' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      jsonString +
      closeDelimiter;

    const uploadUrl = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existingFileId)}?uploadType=multipart&fields=id,name,webViewLink,modifiedTime`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,modifiedTime';

    const res = await fetch(uploadUrl, {
      method: existingFileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`فشل رفع ملف JSON إلى Google Drive (${res.status}): ${errText}`);
    }

    return (await res.json()) as {
      id: string;
      name: string;
      webViewLink?: string;
      modifiedTime?: string;
    };
  };

  const uploadedMain = await uploadMultipart(
    targetFileName,
    mainFile && mainFile.name === targetFileName ? mainFile.id : undefined
  );

  if (options?.createSnapshotCopy) {
    const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    await uploadMultipart(`tamween_backup_${dateStamp}.json`);
  }

  lastDriveSyncInfo = {
    timestamp: nowStr,
    fileId: uploadedMain.id,
    fileName: uploadedMain.name,
    email,
    status: 'synced',
    message: `تم حفظ ومزامنة ملف (${uploadedMain.name}) على Google Drive بنجاح (${mergedState.bakeries.length} مخبز • ${mergedState.debts.length} قيد مديونية)`,
  };

  try {
    localStorage.setItem('TAMWEEN_LAST_DRIVE_SYNC_INFO', JSON.stringify(lastDriveSyncInfo));
  } catch {
    // ignore
  }

  return {
    success: true,
    fileId: uploadedMain.id,
    fileName: uploadedMain.name,
    webViewLink: uploadedMain.webViewLink,
    email,
    mergedState,
    addedBakeriesCount,
    addedDebtsCount,
    timestamp: nowStr,
    message: lastDriveSyncInfo.message,
  };
}

/**
 * Fetch all JSON backup files from Google Drive and merge them additively into currentState
 * WITHOUT deleting any existing record.
 */
export async function fetchAndMergeAllJsonFromGoogleDrive(
  currentState: AppState,
  interactive: boolean = true
): Promise<DriveSyncResult> {
  const nowStr = new Date().toLocaleString('ar-EG');
  const files = await listGoogleDriveJsonBackups(interactive);
  const email =
    getConnectedGoogleEmail() ||
    currentState.systemConfig?.gmailEmail ||
    'ELHOSINY2020@gmail.com';

  if (files.length === 0) {
    // No files yet on Drive: upload the current state immediately as the initial Drive file!
    return uploadAndSyncJsonToGoogleDrive(currentState, { interactive });
  }

  const initialBakeriesCount = currentState.bakeries.length;
  const initialDebtsCount = currentState.debts.length;
  let workingState: AppState = { ...currentState };

  // Process oldest to newest so latest updates take precedence while preserving every unique record
  const chronologicalFiles = [...files].reverse();
  for (const file of chronologicalFiles) {
    const rawJson = await downloadGoogleDriveFileJson(file.id, false);
    const extracted = extractAppStateFromArbitraryJson(rawJson);
    if (extracted) {
      workingState = mergeStates(workingState, extracted);
    }
  }

  const addedBakeriesCount = Math.max(0, workingState.bakeries.length - initialBakeriesCount);
  const addedDebtsCount = Math.max(0, workingState.debts.length - initialDebtsCount);

  // Also upload the unified merged state back to the main file on Google Drive
  const syncRes = await uploadAndSyncJsonToGoogleDrive(workingState, { interactive: false });

  return {
    ...syncRes,
    mergedState: syncRes.mergedState || workingState,
    addedBakeriesCount,
    addedDebtsCount,
    timestamp: nowStr,
    message: `تم جلب ودمج (${files.length}) ملف JSON من Google Drive بدون مسح أي بيانات (إجمالي: ${workingState.bakeries.length} مخبز [أضيف ${addedBakeriesCount} جديد] • ${workingState.debts.length} مديونية [أضيف ${addedDebtsCount} جديد])`,
  };
}
