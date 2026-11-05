@echo off
title FRCC Development Server
cd /d "%~dp0"
echo ====================================================
echo Starting FRCC Main Dev Server (Vite + API)...
echo   Frontend : http://localhost:5174
echo   API      : http://localhost:5005
echo ====================================================
npm run dev:all
pause

