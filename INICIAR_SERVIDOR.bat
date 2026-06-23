@echo off
echo ====================================================
echo      INICIANDO O BACKEND LOCAL DO JOGO TIKTOK (PAC-MAN)
echo ====================================================
echo.

echo [1] Iniciando o servidor Node.js na porta 3000...
start "Servidor Node.js" cmd /k "node server.js"

echo Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

echo [2] Conectando ao Ngrok (seventy-scoured-antivirus.ngrok-free.dev)...
start "Ngrok Tunnel" cmd /k "ngrok.exe http --domain=seventy-scoured-antivirus.ngrok-free.dev 3000"

echo.
echo [3] Abrindo o jogo Pac-Man no navegador...
start http://localhost:3000/pacman.html

echo.
echo ====================================================
echo TUDO PRONTO! 
echo O seu computador agora e o servidor oficial do jogo.
echo Mantenha as duas janelas pretas abertas enquanto joga.
echo ====================================================
pause
