import { AppState } from '../storage';

export const OFFICIAL_ONLINE_URL = 'https://ais-pre-7v2ybbenoneaktwif4yyyx-518853989588.europe-west2.run.app';

/**
 * Downloads a complete, standalone, self-contained HTML application file
 * with ALL current modifications, bakeries, debts, and settings preloaded.
 * 
 * Works everywhere:
 * 1. Opens directly on ANY computer (Windows, Mac, Linux) or phone when double-clicked.
 * 2. Runs 100% offline with zero network requests or servers required.
 * 3. Uses standard script tags (non-module) so Chrome and Edge NEVER block it on file:///
 * 4. Permanently saves changes on the device via LocalStorage/IndexedDB.
 */
export async function downloadUpdatedAppHtml(currentState: AppState): Promise<{ success: boolean; message: string; fileName?: string }> {
  try {
    const exportTimestamp = new Date().toISOString();
    const exportPayload = {
      exportTimestamp,
      version: '3.0',
      bakeries: currentState.bakeries,
      debts: currentState.debts,
      villages: currentState.villages,
      issuingEntities: currentState.issuingEntities,
      violationTypes: currentState.violationTypes,
      activityStatuses: currentState.activityStatuses,
      columnTitles: currentState.columnTitles,
      systemConfig: currentState.systemConfig,
      users: currentState.users,
    };

    const preloadedScript = '<scr' + 'ipt id="tamween-preloaded-data">\nwindow.PRELOADED_TAMWEEN_STATE = ' + JSON.stringify(exportPayload) + ';\n</scr' + 'ipt>';

    let baseHtml = '';

    // If running on a web server (http / https), fetch the pre-built standalone template from /tamween-system.html
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/tamween-system.html');
        if (res.ok) {
          baseHtml = await res.text();
        }
      } catch (err) {
        console.warn('Could not fetch /tamween-system.html, attempting fallback', err);
      }
    }

    // Fallback: use current document HTML if standalone template is inaccessible
    if (!baseHtml && typeof document !== 'undefined') {
      baseHtml = '<!doctype html>\n' + document.documentElement.outerHTML;
    }

    if (!baseHtml) {
      throw new Error('تعذر إنشاء ملف المنظومة من الذاكرة.');
    }

    // Remove external CDN script tags (e.g. html2pdf) that block offline execution on local disks (file://)
    baseHtml = baseHtml.replace(
      /<script[^>]*src="https:\/\/cdnjs\.cloudflare\.com[^>]*><\/script>/gi,
      `<!-- Non-blocking offline script fallback -->
  <script>
    try {
      if (typeof window !== 'undefined' && navigator.onLine) {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        s.async = true;
        document.head.appendChild(s);
      }
    } catch (e) {}
  </script>`
    );

    // Fix any remaining type="module" to standard <script> for file:/// compatibility
    baseHtml = baseHtml.replace(/<script type="module"/gi, '<script');
    baseHtml = baseHtml.replace(/crossorigin="[^"]*"/gi, '');
    baseHtml = baseHtml.replace(/crossorigin/gi, '');

    // Inject or update the preloaded state script inside the HTML SAFELY using a function replacer
    let updatedHtml = '';
    const preloadedRegex = /<script id="tamween-preloaded-data">[\s\S]*?<\/script>/i;

    if (preloadedRegex.test(baseHtml)) {
      updatedHtml = baseHtml.replace(preloadedRegex, () => preloadedScript);
    } else if (baseHtml.includes('</head>')) {
      updatedHtml = baseHtml.replace('</head>', () => `${preloadedScript}\n</head>`);
    } else {
      updatedHtml = preloadedScript + '\n' + baseHtml;
    }

    const blob = new Blob([updatedHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `منظومة_تموين_المحلة_المحدثة_${dateStr}.html`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      message: `تم إصلاح وتحميل ملف المنظومة بنجاح باسم (${fileName})! يفتح مباشرة على أي جهاز بدون إنترنت ويحتوي على (${currentState.bakeries.length}) مخبز و (${currentState.debts.length}) مديونية.`,
      fileName,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `فشل تحميل النسخة المحدثة: ${(err as Error).message || 'حدث خطأ'}`,
    };
  }
}

/**
 * Downloads the official Desktop Launcher named "منظومة وزارة التموين.html"
 * with the official Ministry of Supply emblem, gold seal, and direct opening capabilities.
 */
export function downloadMinistryDesktopShortcut(): { success: boolean; message: string; fileName: string } {
  try {
    const currentUrl = typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && window.location.protocol.startsWith('http')
      ? window.location.origin
      : OFFICIAL_ONLINE_URL;

    const htmlContent = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>منظومة وزارة التموين</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='32' r='30' fill='%230f172a' stroke='%23eab308' stroke-width='3'/><path d='M32 14 L36 24 L46 24 L38 31 L41 41 L32 35 L23 41 L26 31 L18 24 L28 24 Z' fill='%23eab308'/><ellipse cx='32' cy='48' rx='8' ry='3' fill='%23fde68a'/></svg>" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', system-ui, sans-serif; }
      body {
        min-height: 100vh;
        background: radial-gradient(circle at 50% 20%, #1e293b 0%, #0f172a 100%);
        color: #fff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        text-align: center;
      }
      .card {
        background: rgba(30, 41, 59, 0.9);
        border: 2px solid rgba(234, 179, 8, 0.45);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(234, 179, 8, 0.2);
        border-radius: 26px;
        padding: 40px 30px;
        max-width: 580px;
        width: 100%;
        backdrop-filter: blur(14px);
      }
      .emblem-box {
        width: 104px;
        height: 104px;
        margin: 0 auto 20px;
        border-radius: 50%;
        border: 3px solid #eab308;
        background: #0f172a;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        box-shadow: 0 12px 28px rgba(234, 179, 8, 0.35);
      }
      .emblem-box svg {
        width: 76px;
        height: 76px;
      }
      h1 { font-size: 24px; font-weight: 900; color: #fef08a; margin-bottom: 6px; }
      h2 { font-size: 16px; font-weight: 700; color: #f8fafc; margin-bottom: 4px; }
      h3 { font-size: 13px; font-weight: 600; color: #94a3b8; margin-bottom: 26px; }
      .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        width: 100%;
        padding: 14px 22px;
        margin-bottom: 14px;
        border-radius: 14px;
        font-size: 15px;
        font-weight: 800;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
      }
      .btn-primary {
        background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
        color: #ffffff;
        box-shadow: 0 6px 18px rgba(217, 119, 6, 0.4);
      }
      .btn-primary:hover {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        transform: translateY(-2px);
      }
      .btn-secondary {
        background: #334155;
        color: #f1f5f9;
        border: 1px solid #475569;
      }
      .btn-secondary:hover {
        background: #475569;
        transform: translateY(-2px);
      }
      .timer-badge {
        display: inline-block;
        background: rgba(234, 179, 8, 0.15);
        color: #fef08a;
        border: 1px solid rgba(234, 179, 8, 0.3);
        padding: 8px 20px;
        border-radius: 24px;
        font-size: 13px;
        font-weight: 800;
        margin-top: 10px;
      }
      .tip-box {
        margin-top: 22px;
        padding: 14px;
        background: rgba(15, 23, 42, 0.7);
        border: 1px dashed #475569;
        border-radius: 14px;
        font-size: 12px;
        color: #cbd5e1;
        line-height: 1.7;
        text-align: right;
      }
    </style>
    <` + `script>
      let countdown = 2;
      const targetUrl = "${currentUrl}";
      function startRedirect() {
        const timerEl = document.getElementById('countdown-sec');
        const interval = setInterval(function() {
          countdown--;
          if (timerEl) timerEl.innerText = countdown;
          if (countdown <= 0) {
            clearInterval(interval);
            window.location.href = targetUrl;
          }
        }, 1000);
      }
      window.onload = startRedirect;
    <` + `/script>
  </head>
  <body>
    <div class="card">
      <div class="emblem-box">
        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="30" fill="#0f172a" stroke="#eab308" stroke-width="2.5" />
          <path d="M 6 32 A 26 26 0 0 1 58 32 Z" fill="#b91c1c" opacity="0.85" />
          <rect x="6" y="27" width="52" height="10" fill="#ffffff" opacity="0.9" />
          <path d="M 6 32 A 26 26 0 0 0 58 32 Z" fill="#000000" opacity="0.8" />
          <path d="M 32 12 Q 46 16 44 34 Q 40 48 32 54 Q 24 48 20 34 Q 18 16 32 12 Z" fill="#0f172a" stroke="#eab308" stroke-width="2" />
          <path d="M 32 18 Q 34 16 36 17 L 34 20 L 33 22 L 31 22 L 30 20 Z" fill="#eab308" />
          <path d="M 32 23 L 26 25 L 23 32 L 27 34 L 30 28 Z" fill="#eab308" />
          <path d="M 32 23 L 38 25 L 41 32 L 37 34 L 34 28 Z" fill="#eab308" />
          <ellipse cx="32" cy="49" rx="7" ry="2.5" fill="#fde68a" stroke="#d97706" stroke-width="1" />
        </svg>
      </div>

      <h1>منظومة وزارة التموين</h1>
      <h2>مديرية التموين والتجارة الداخلية بالغربية</h2>
      <h3>إدارة تموين مركز المحلة الكبرى &bull; قاعدة بيانات المخابز والمديونيات</h3>

      <a href="${currentUrl}" class="btn btn-primary">
        🚀 الدخول المباشر إلى المنظومة الآن
      </a>

      <a href="tamween-system.html" class="btn btn-secondary">
        💾 فتح ملف المنظومة المحلي على هذا الجهاز (بدون إنترنت)
      </a>

      <div class="timer-badge">
        جاري فتح صفحة المنظومة تلقائياً خلال (<span id="countdown-sec">2</span>) ثانية...
      </div>

      <div class="tip-box">
        📌 <strong>طريقة وضع الأيقونة على سطح المكتب:</strong><br />
        1. تم تنزيل هذا الملف في مجلد التنزيلات (Downloads) باسم <strong>«منظومة وزارة التموين.html»</strong>.<br />
        2. اسحب الملف أو انسخه إلى <strong>سطح المكتب (Desktop)</strong>.<br />
        3. عند النقر عليه مرتين في أي وقت، يفتح لك صفحة البرنامج مباشرة بشعار الوزارة!
      </div>
    </div>
  </body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fileName = 'منظومة وزارة التموين.html';

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      message: `تم تحميل ملف أيقونة سطح المكتب بنجاح باسم (${fileName})! انقله إلى سطح المكتب لفتحه بنقرة واحدة دائماً.`,
      fileName,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `فشل التحميل: ${(err as Error).message}`,
      fileName: '',
    };
  }
}

/**
 * Downloads a native Windows Internet Shortcut (.url) file
 * titled "منظومة وزارة التموين.url"
 */
export function downloadWindowsUrlShortcut(): { success: boolean; message: string; fileName: string } {
  try {
    const currentUrl = typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && window.location.protocol.startsWith('http')
      ? window.location.origin
      : OFFICIAL_ONLINE_URL;

    const shortcutContent = `[{000214A0-0000-0000-C000-000000000046}]
Prop3=19,11
[InternetShortcut]
IDList=
URL=${currentUrl}
IconIndex=0
HotKey=0
`;

    const blob = new Blob([shortcutContent], { type: 'application/octet-stream;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fileName = 'منظومة وزارة التموين.url';

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      message: `تم تحميل اختصار ويندوز (${fileName}) بنجاح! ضعه على سطح المكتب للنقر عليه والدخول الفوري.`,
      fileName,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `فشل التحميل: ${(err as Error).message}`,
      fileName: '',
    };
  }
}

/**
 * Downloads a native Windows Desktop Installer Batch (.bat) file
 * that automatically creates an actual Windows Application Shortcut on the Desktop
 * named "منظومة وزارة التموين.url" or launches it directly!
 */
export function downloadWindowsDesktopInstallerBat(): { success: boolean; message: string; fileName: string } {
  try {
    const currentUrl = typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && window.location.protocol.startsWith('http')
      ? window.location.origin
      : OFFICIAL_ONLINE_URL;

    const batContent = `@echo off
chcp 65001 >nul
title تثبيت أيقونة منظومة وزارة التموين
echo ===================================================================
echo جمهورية مصر العربية - وزارة التموين والتجارة الداخلية
echo إدارة تموين مركز المحلة الكبرى
echo ===================================================================
echo.
echo جاري إنشاء أيقونة المنظومة مباشرة على سطح المكتب (Desktop)...

set SCRIPT="%TEMP%\\make_tamween_ico_%RANDOM%.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\\منظومة وزارة التموين.url" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "${currentUrl}" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript //nologo %SCRIPT%
del %SCRIPT%

echo.
echo [تم بنجاح!] تم تثبيت أيقونة "منظومة وزارة التموين" على سطح المكتب الآن.
echo جاري فتح صفحة البرنامج في المتصفح...
start "" "${currentUrl}"
`;

    const blob = new Blob([batContent], { type: 'application/x-bat;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fileName = 'تثبيت_أيقونة_المنظومة_على_سطح_المكتب.bat';

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      message: `تم تنزيل ملف (${fileName})! انقر عليه لتثبيت أيقونة المنظومة تلقائياً على سطح المكتب وتشغيل البرنامج فوراً.`,
      fileName,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `فشل التحميل: ${(err as Error).message}`,
      fileName: '',
    };
  }
}

/**
 * Downloads a silent Windows VBScript launcher
 */
export function downloadWindowsVbsLauncher(): { success: boolean; message: string; fileName: string } {
  try {
    const currentUrl = typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && window.location.protocol.startsWith('http')
      ? window.location.origin
      : OFFICIAL_ONLINE_URL;

    const vbsContent = `' مشغل منظومة وزارة التموين المكتبي الصامت
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "${currentUrl}", 1, False
`;

    const blob = new Blob([vbsContent], { type: 'text/vbscript;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fileName = 'منظومة وزارة التموين.vbs';

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      message: `تم تنزيل مشغل ويندوز الصامت (${fileName})! انقله إلى سطح المكتب لفتح المنظومة مباشرة دون إظهار شاشة الأوامر.`,
      fileName,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `فشل التحميل: ${(err as Error).message}`,
      fileName: '',
    };
  }
}

/**
 * Directly downloads the authentic Windows PE executable "منظومة_وزارة_التموين.exe"
 * which launches the official application with zero console windows.
 */
export async function downloadWindowsExeLauncher(): Promise<{ success: boolean; message: string; fileName: string }> {
  try {
    const fileName = 'منظومة_وزارة_التموين.exe';
    const res = await fetch('/' + encodeURIComponent(fileName));
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return {
        success: true,
        message: `تم تحميل ملف تشغيل ويندوز التنفيذي (${fileName}) بنجاح! انقر عليه مرتين لتشغيل المنظومة مباشرة.`,
        fileName
      };
    }
  } catch (e) {
    console.warn('Could not fetch .exe file directly, using batch installer fallback', e);
  }

  // Fallback to the Windows Batch Desktop Installer
  return downloadWindowsDesktopInstallerBat();
}

/**
 * Legacy launcher shortcut
 */
export function downloadAppLauncherHtml(): { success: boolean; message: string } {
  const res = downloadMinistryDesktopShortcut();
  return { success: res.success, message: res.message };
}

/**
 * Directly opens the standalone application in a new browser tab/window.
 */
export function openStandaloneAppInNewTab(): void {
  if (typeof window !== 'undefined') {
    window.open('/tamween-system.html', '_blank');
  }
}

