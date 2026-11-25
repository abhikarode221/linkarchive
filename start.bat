@echo off
title Links - Link Manager Server
cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created .env from .env.example. Please add your MongoDB Atlas URI to .env.
)

echo Starting Links server on http://localhost:3000 ...
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"
node server.js
pause
