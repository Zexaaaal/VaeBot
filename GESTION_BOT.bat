@echo off
setlocal
color 0b
title GESTIONNAIRE BOT QI (Quasar)

set VPS_HOST=VPS-925156.ssh.vps1euro.fr
set VPS_PORT=9739
set VPS_PWD=1b97865b
set REMOTE_DIR=/root/discord_bot

:menu
cls
echo ========================================================
echo             CENTRE DE CONTROLE BOT QI (vps1euro)
echo ========================================================
echo.
echo  MOT DE PASSE : %VPS_PWD% (clic-droit pour coller)
echo  IPV6 REELLE : 2001:0861:4a41:6910:b6ad:4ea7:6f58:8e90
echo.
echo  [1] OUVRIR LA CONSOLE (SSH)
echo  [2] ENVOYER LES FICHIERS ET REDEMARRER (PUSH + PM2)
echo  [3] VOIR LES LOGS DU BOT (Dernieres erreurs)
echo  [4] DEPANNAGE VOIX (Activer le pont NAT64 si besoin)
echo  [5] QUITTER
echo.
echo ========================================================
set /p choice=Choisis une option [1-5]: 

if "%choice%"=="1" goto ssh
if "%choice%"=="2" goto push
if "%choice%"=="3" goto logs
if "%choice%"=="4" goto nat64
if "%choice%"=="5" exit
goto menu

:ssh
cls
echo ========================================================
echo             OUVERTURE DE LA CONSOLE...
echo ========================================================
ssh root@%VPS_HOST% -p %VPS_PORT%
pause
goto menu

:push
cls
echo ========================================================
echo             ENVOI DU CODE EN COURS... (SCP)
echo ========================================================
echo Creation du dossier si besoin...
ssh root@%VPS_HOST% -p %VPS_PORT% "mkdir -p %REMOTE_DIR%"
echo Envoi des fichiers locaux... (Veuillez coller le mdp si demande)
scp -P %VPS_PORT% -r ./* root@%VPS_HOST%:%REMOTE_DIR%/
echo Redemarrage du bot... (npm install + pm2 restart)
ssh root@%VPS_HOST% -p %VPS_PORT% "cd %REMOTE_DIR% && npm install && pm2 restart all || pm2 start src/index.js --name \"qi-bot\""
echo.
echo Termine !
pause
goto menu

:logs
cls
echo ========================================================
echo             LOGS DU BOT (Affichage en direct)
echo ========================================================
ssh root@%VPS_HOST% -p %VPS_PORT% "pm2 logs qi-bot --lines 50"
pause
goto menu

:nat64
cls
echo ========================================================
echo             ACTIVATION DU PONT NAT64 (IPV6)
echo ========================================================
ssh root@%VPS_HOST% -p %VPS_PORT% "echo -e \"nameserver 2a01:4f8:c2c:123b::1\nnameserver 2a00:1098:2c::1\" | sudo tee /etc/resolv.conf && ping -c 3 8.8.8.8"
echo.
echo Si vous avez vu des '64 bytes from 8.8.8.8', c'est que c'est gagne !
pause
goto menu
