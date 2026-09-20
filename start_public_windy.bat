@echo off
title Windy Typing Platform
echo ========================================================
echo          WINDY TYPING SERVER & PUBLIC TUNNEL
echo ========================================================
echo [1/2] Mahalliy server ishga tushirilmoqda...
start /b python server.py
timeout /t 2 >nul
echo [2/2] Internet tarmog'iga ulanmoqda...
echo Brauzerda ochish uchun: http://localhost:3000
echo.
cloudflared.exe tunnel --url http://localhost:3000
