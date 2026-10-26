@echo off
setlocal
cd /d "%~dp0frontend"

set "PATH=C:\Program Files\nodejs;%PATH%"

echo ==========================================================
echo  Starting CareFlow Frontend (Next.js 15 + React 19)
echo ==========================================================
echo  URL: http://localhost:3000
echo ==========================================================

npm run dev

