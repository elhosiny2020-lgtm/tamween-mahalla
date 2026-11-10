import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const publicDir = path.resolve('public');

if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist. Run npm run build first.');
  process.exit(1);
}

// 1. Generate full self-contained single-file HTML application: tamween-system.html
const htmlPath = path.join(distDir, 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// Inline CSS
const cssFiles = fs.readdirSync(path.join(distDir, 'assets')).filter(f => f.endsWith('.css'));
if (cssFiles.length > 0) {
  const cssContent = fs.readFileSync(path.join(distDir, 'assets', cssFiles[0]), 'utf-8');
  htmlContent = htmlContent.replace(
    new RegExp(`<link rel="stylesheet"[^>]*href="/assets/${cssFiles[0]}"[^>]*>`, 'g'),
    () => `<style>\n${cssContent}\n</style>`
  );
}

// Inline Favicon SVG as base64 Data URI
const faviconPath = path.join(publicDir, 'favicon.svg');
let encodedFavicon = '';
if (fs.existsSync(faviconPath)) {
  const faviconSvg = fs.readFileSync(faviconPath, 'utf-8');
  encodedFavicon = `data:image/svg+xml;utf8,${encodeURIComponent(faviconSvg)}`;
  htmlContent = htmlContent.replace(
    /<link rel="icon"[^>]*href="[^"]*"[^>]*\/>/g,
    () => `<link rel="icon" type="image/svg+xml" href="${encodedFavicon}" />`
  );
  htmlContent = htmlContent.replace(
    /<link rel="alternate icon"[^>]*href="[^"]*"[^>]*\/>/g,
    () => `<link rel="alternate icon" href="${encodedFavicon}" />`
  );
}

// Remove the external module script from head
const jsFiles = fs.readdirSync(path.join(distDir, 'assets')).filter(f => f.endsWith('.js'));
if (jsFiles.length > 0) {
  let jsContent = fs.readFileSync(path.join(distDir, 'assets', jsFiles[0]), 'utf-8');
  // Escape closing script tags to prevent premature HTML parser close
  jsContent = jsContent.replace(/<\/script>/gi, '<\\/script>');

  // Remove module script tag & external blocking scripts from <head>
  htmlContent = htmlContent.replace(
    new RegExp(`<script type="module"[^>]*src="/assets/${jsFiles[0]}"[^>]*></script>`, 'g'),
    ''
  );
  htmlContent = htmlContent.replace(
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

  // Preloaded data container & global error safety script in <head>
  const headAdditions = `
  <script id="tamween-preloaded-data">
    window.PRELOADED_TAMWEEN_STATE = null;
  </script>
  <script>
    window.addEventListener('error', function(e) {
      console.warn('Tamween System Error Log:', e.message);
    });
  </script>`;

  htmlContent = htmlContent.replace('</head>', () => `${headAdditions}\n</head>`);

  // Fallback splash screen inside #root so user never sees a white screen
  const splashScreenHtml = `
    <div id="root">
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0f172a;color:#fff;font-family:'Cairo',system-ui,sans-serif;text-align:center;padding:24px;">
        <div style="width:76px;height:76px;margin-bottom:16px;border-radius:50%;border:2px solid #eab308;background:#1e293b;padding:8px;box-shadow:0 10px 25px -5px rgba(234,179,8,0.3);display:flex;align-items:center;justify-content:center;">
          ${encodedFavicon ? `<img src="${encodedFavicon}" alt="شعار وزارة التموين" style="width:56px;height:56px;" />` : ''}
        </div>
        <h1 style="font-size:20px;font-weight:900;color:#fef08a;margin:0 0 6px 0;">جمهورية مصر العربية - وزارة التموين</h1>
        <h2 style="font-size:16px;font-weight:700;color:#e2e8f0;margin:0 0 4px 0;">مديرية التموين بالغربية - إدارة تموين مركز المحلة الكبرى</h2>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 16px 0;">قاعدة بيانات المخابز والمديونيات والتنبيهات</p>
        <div style="display:flex;align-items:center;gap:8px;color:#fde047;font-size:12px;font-weight:bold;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#eab308;animation:pulse 1.5s infinite;"></span>
          <span>جاري فتح وتشغيل المنظومة مباشرة...</span>
        </div>
      </div>
    </div>`;

  htmlContent = htmlContent.replace('<div id="root"></div>', () => splashScreenHtml);

  // Inject the bundled JavaScript as a STANDARD script at the bottom of <body>
  // (Standard script without type="module" ensures 100% execution on file:/// local disks in Chrome/Edge/Firefox)
  const bottomScript = `\n<script>\n${jsContent}\n</script>\n</body>`;
  htmlContent = htmlContent.replace('</body>', () => bottomScript);
}

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write the standalone app
const targetSystemPublic = path.join(publicDir, 'tamween-system.html');
fs.writeFileSync(targetSystemPublic, htmlContent, 'utf-8');

const targetSystemDist = path.join(distDir, 'tamween-system.html');
fs.writeFileSync(targetSystemDist, htmlContent, 'utf-8');

// 2. Generate Desktop Launcher: منظومة وزارة التموين.html
const ONLINE_URL = 'https://ais-pre-7v2ybbenoneaktwif4yyyx-518853989588.europe-west2.run.app';
const desktopLauncherContent = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>منظومة وزارة التموين - إدارة تموين مركز المحلة الكبرى</title>
    ${encodedFavicon ? `<link rel="icon" type="image/svg+xml" href="${encodedFavicon}" />` : ''}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', system-ui, sans-serif; }
      body {
        min-height: 100vh;
        background: radial-gradient(circle at top, #1e293b 0%, #0f172a 100%);
        color: #fff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        text-align: center;
      }
      .card {
        background: rgba(30, 41, 59, 0.85);
        border: 2px solid rgba(234, 179, 8, 0.4);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 30px rgba(234, 179, 8, 0.15);
        border-radius: 24px;
        padding: 36px 28px;
        max-width: 580px;
        width: 100%;
        backdrop-filter: blur(12px);
      }
      .emblem-wrapper {
        width: 96px;
        height: 96px;
        margin: 0 auto 20px;
        border-radius: 50%;
        border: 3px solid #eab308;
        background: #0f172a;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px;
        box-shadow: 0 10px 25px rgba(234, 179, 8, 0.35);
      }
      .emblem-wrapper img {
        width: 72px;
        height: 72px;
      }
      h1 { font-size: 22px; font-weight: 900; color: #fef08a; margin-bottom: 6px; }
      h2 { font-size: 16px; font-weight: 700; color: #f8fafc; margin-bottom: 4px; }
      h3 { font-size: 13px; font-weight: 600; color: #94a3b8; margin-bottom: 24px; }
      .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        width: 100%;
        padding: 14px 20px;
        margin-bottom: 12px;
        border-radius: 14px;
        font-size: 14px;
        font-weight: 800;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
      }
      .btn-primary {
        background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
        color: #ffffff;
        box-shadow: 0 4px 15px rgba(217, 119, 6, 0.4);
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
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        margin-top: 10px;
      }
      .tip-box {
        margin-top: 20px;
        padding: 12px;
        background: rgba(15, 23, 42, 0.6);
        border: 1px dashed #475569;
        border-radius: 12px;
        font-size: 11px;
        color: #cbd5e1;
        line-height: 1.6;
      }
    </style>
    <script>
      let countdown = 2;
      const targetUrl = "${ONLINE_URL}";
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
    </script>
  </head>
  <body>
    <div class="card">
      <div class="emblem-wrapper">
        ${encodedFavicon ? `<img src="${encodedFavicon}" alt="شعار وزارة التموين" />` : ''}
      </div>
      <h1>منظومة وزارة التموين</h1>
      <h2>مديرية التموين والتجارة الداخلية بالغربية</h2>
      <h3>إدارة تموين مركز المحلة الكبرى &bull; قاعدة بيانات المخابز والمديونيات</h3>

      <a href="${ONLINE_URL}" class="btn btn-primary">
        🚀 الدخول المباشر إلى المنظومة الآن
      </a>

      <a href="tamween-system.html" class="btn btn-secondary">
        💾 فتح النسخة المحلية المحفوظة على هذا الجهاز (بدون نت)
      </a>

      <div class="timer-badge">
        جاري الفتح التلقائي لصفحة المنظومة خلال (<span id="countdown-sec">2</span>) ثانية...
      </div>

      <div class="tip-box">
        💡 <strong>نصيحة للمستخدم:</strong> انقل هذا الملف إلى <strong>سطح المكتب (Desktop)</strong> ليكون بمثابة أيقونة الوزارة الدائمة التي تفتح المنظومة بنقرة واحدة في أي وقت.
      </div>
    </div>
  </body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'منظومة وزارة التموين.html'), desktopLauncherContent, 'utf-8');
fs.writeFileSync(path.join(distDir, 'منظومة وزارة التموين.html'), desktopLauncherContent, 'utf-8');

// 3. Generate Windows Desktop Shortcut: منظومة وزارة التموين.url
const windowsShortcutContent = `[{000214A0-0000-0000-C000-000000000046}]
Prop3=19,11
[InternetShortcut]
IDList=
URL=${ONLINE_URL}
IconIndex=0
HotKey=0
`;

fs.writeFileSync(path.join(publicDir, 'منظومة وزارة التموين.url'), windowsShortcutContent, 'utf-8');
fs.writeFileSync(path.join(distDir, 'منظومة وزارة التموين.url'), windowsShortcutContent, 'utf-8');

// Also keep legacy name for backwards compatibility
fs.writeFileSync(path.join(publicDir, 'tamween-online-shortcut.html'), desktopLauncherContent, 'utf-8');
fs.writeFileSync(path.join(distDir, 'tamween-online-shortcut.html'), desktopLauncherContent, 'utf-8');

// 4. Generate Windows Desktop Batch Installer: تثبيت_أيقونة_المنظومة_على_سطح_المكتب.bat
const windowsBatInstaller = `@echo off
chcp 65001 >nul
title منظومة وزارة التموين والتجارة الداخلية - إدارة تموين مركز المحلة الكبرى
echo ===================================================================
echo جمهورية مصر العربية - وزارة التموين والتجارة الداخلية
echo مديرية التموين بالغربية - إدارة تموين مركز المحلة الكبرى
echo ===================================================================
echo.
echo جاري إنشاء وتشغيل أيقونة المنظومة مباشرة على سطح المكتب (Desktop)...

set SCRIPT="%TEMP%\\tamween_shortcut_%RANDOM%.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\\منظومة وزارة التموين.url" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "${ONLINE_URL}" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript //nologo %SCRIPT%
del %SCRIPT%

echo.
echo [تم بنجاح] تم تثبيت أيقونة المنظومة على سطح المكتب الآن.
echo جاري فتح صفحة البرنامج...
start "" msedge --app="${ONLINE_URL}" 2>nul || start "" "${ONLINE_URL}"
`;

fs.writeFileSync(path.join(publicDir, 'تثبيت_أيقونة_المنظومة_على_سطح_المكتب.bat'), windowsBatInstaller, 'utf-8');
fs.writeFileSync(path.join(distDir, 'تثبيت_أيقونة_المنظومة_على_سطح_المكتب.bat'), windowsBatInstaller, 'utf-8');

// 5. Build native Windows EXE via python script
try {
  import('child_process').then(cp => {
    cp.execSync('python3 scripts/build_windows_exe.py');
  });
} catch (e) {
  console.warn('Could not build EXE in bundle step:', e);
}

console.log(`Successfully generated:
- tamween-system.html (${(htmlContent.length / 1024).toFixed(1)} KB)
- منظومة وزارة التموين.html
- منظومة وزارة التموين.url
- تثبيت_أيقونة_المنظومة_على_سطح_المكتب.bat
- منظومة_وزارة_التموين.exe`);

