@echo off
chcp 65001 >nul
title منظومة وزارة التموين والتجارة الداخلية - إدارة تموين مركز المحلة الكبرى
echo ===================================================================
echo جمهورية مصر العربية - وزارة التموين والتجارة الداخلية
echo مديرية التموين بالغربية - إدارة تموين مركز المحلة الكبرى
echo ===================================================================
echo.
echo جاري إنشاء وتشغيل أيقونة المنظومة مباشرة على سطح المكتب (Desktop)...

set SCRIPT="%TEMP%\tamween_shortcut_%RANDOM%.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\منظومة وزارة التموين.url" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "https://ais-pre-7v2ybbenoneaktwif4yyyx-518853989588.europe-west2.run.app" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript //nologo %SCRIPT%
del %SCRIPT%

echo.
echo [تم بنجاح] تم تثبيت أيقونة المنظومة على سطح المكتب الآن.
echo جاري فتح صفحة البرنامج...
start "" msedge --app="https://ais-pre-7v2ybbenoneaktwif4yyyx-518853989588.europe-west2.run.app" 2>nul || start "" "https://ais-pre-7v2ybbenoneaktwif4yyyx-518853989588.europe-west2.run.app"
