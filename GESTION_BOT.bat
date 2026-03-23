@echo off
setlocal
color 0b
title CENTRE DE CONTROLE BOT QI (vps1euro)

set VPS_HOST=VPS-925156.ssh.vps1euro.fr
set VPS_PORT=9739
set VPS_PWD=1b97865b
set REMOTE_DIR=/root/discord_bot

:menu
cls
echo ========================================================
echo             CENTRE DE CONTROLE BOT QI (Quasar)
echo ========================================================
echo.
echo  MOT DE PASSE : %VPS_PWD% 
echo  STATUS RESEAU: IPv6 ONLY (Restriction VPS 1€)
echo.
echo  [1] OUVRIR LA CONSOLE (SSH)
echo  [2] ENVOYER FICHIERS + MAJ + DEMARRER (Full Push)
echo  [3] VOIR LES LOGS DU BOT (Dernières erreurs)
echo  [4] JUSTE RELANCER LE BOT (PM2 Restart)
echo  [5] ARRÊTER LE BOT (PM2 Stop)
echo  [6] ENVOYER LE FICHIER .ENV (Secrets)
echo  [7] ACTIVER LE PONT IPv6 (Dépannage Voix)
echo  [8] QUITTER
echo.
echo ========================================================
set /p choice=Choisis une option [1-8]: 

if "%choice%"=="1" goto ssh
if "%choice%"=="2" goto fullpush
if "%choice%"=="3" goto logs
if "%choice%"=="4" goto restart
if "%choice%"=="5" goto stop
if "%choice%"=="6" goto pushenv
if "%choice%"=="7" goto nat64
if "%choice%"=="8" exit
goto menu

:ssh
cls
ssh root@%VPS_HOST% -p %VPS_PORT%
pause
goto menu

:fullpush
cls
echo Creation du dossier si besoin...
ssh root@%VPS_HOST% -p %VPS_PORT% "mkdir -p %REMOTE_DIR%"
echo Envoi des fichiers locaux...
scp -P %VPS_PORT% -r ./* root@%VPS_HOST%:%REMOTE_DIR%/
echo Installation des modules et démarrage...
ssh root@%VPS_HOST% -p %VPS_PORT% "cd %REMOTE_DIR% && npm install && pm2 restart all || pm2 start src/index.js --name \"qi-bot\""
echo.
echo Termine ! Verifie les logs (Option 3).
pause
goto menu

:logs
cls
ssh root@%VPS_HOST% -p %VPS_PORT% "pm2 logs qi-bot --lines 50"
pause
goto menu

:restart
cls
ssh root@%VPS_HOST% -p %VPS_PORT% "pm2 restart all || pm2 start %REMOTE_DIR%/src/index.js --name \"qi-bot\""
pause
goto menu

:stop
cls
ssh root@%VPS_HOST% -p %VPS_PORT% "pm2 stop all"
pause
goto menu

:pushenv
cls
scp -P %VPS_PORT% .env root@%VPS_HOST%:%REMOTE_DIR%/.env
echo Done.
pause
goto menu

:nat64
cls
echo Activation du pont DNS64 de Google...
ssh root@%VPS_HOST% -p %VPS_PORT% "echo -e \"nameserver 2001:4860:4860::6464\nnameserver 2001:4860:4860::64\" | sudo tee /etc/resolv.conf && ping -c 3 ipv4.google.com"
pause
goto menu
