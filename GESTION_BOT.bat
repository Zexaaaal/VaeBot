@echo off
setlocal
color 0b
title GESTIONNAIRE BOT QI (v7)

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
echo.
echo  [1] OUVRIR LA CONSOLE (SSH)
echo  [2] ENVOYER FICHIERS + MOTEUR + DEMARRER (Full Push)
echo  [3] VOIR LES LOGS DU BOT (Logs)
echo  [4] JUSTE RELANCER LE BOT (Restart)
echo  [5] ENVOYER LE FICHIER .ENV (Secrets)
echo  [6] NETTOYAGE COMPLET (Supprimer modules distants)
echo  [7] ACTIVER LE PONT IPv6 (Depannage Voix)
echo  [8] METTRE A JOUR DEPUIS GITHUB (Git Pull)
echo  [9] QUITTER
echo.
echo ========================================================
set /p choice=Choisis une option [1-9]: 

if "%choice%"=="1" goto ssh
if "%choice%"=="2" goto fullpush
if "%choice%"=="3" goto logs
if "%choice%"=="4" goto restart
if "%choice%"=="5" goto pushenv
if "%choice%"=="6" goto cleanup
if "%choice%"=="7" goto nat64
if "%choice%"=="8" goto gitpull
if "%choice%"=="9" exit
goto menu

:ssh
cls
ssh root@%VPS_HOST% -p %VPS_PORT%
pause
goto menu

:fullpush
cls
echo Verification du moteur node_linux...
if not exist "node_linux" goto error_node
goto do_push

:error_node
echo.
echo [ERREUR] Le fichier node_linux est absent du dossier.
echo.
pause
goto menu

:do_push
echo Preparation du dossier distant...
ssh root@%VPS_HOST% -p %VPS_PORT% "mkdir -p %REMOTE_DIR%"
echo Envoi des fichiers (Transfert en cours)...
scp -P %VPS_PORT% -r . root@%VPS_HOST%:%REMOTE_DIR%
echo Configuration et Lancement...
ssh root@%VPS_HOST% -p %VPS_PORT% "cp -f %REMOTE_DIR%/node_linux %REMOTE_DIR%/node && chmod +x %REMOTE_DIR%/node && cd %REMOTE_DIR% && npm install --no-bin-links || echo 'Install failed' && pm2 stop all; pm2 delete qi-bot; pm2 start src/index.js --name \"qi-bot\" --interpreter %REMOTE_DIR%/node"
echo.
echo TERMINE ! Verifie les logs (Option 3).
pause
goto menu

:logs
cls
ssh root@%VPS_HOST% -p %VPS_PORT% "pm2 logs qi-bot --lines 50"
pause
goto menu

:restart
cls
ssh root@%VPS_HOST% -p %VPS_PORT% "pm2 restart qi-bot || pm2 start %REMOTE_DIR%/src/index.js --name \"qi-bot\" --interpreter %REMOTE_DIR%/node"
pause
goto menu

:cleanup
cls
echo Suppression des fichiers corrompus sur le serveur...
ssh root@%VPS_HOST% -p %VPS_PORT% "rm -rf %REMOTE_DIR%/node_modules && rm -f %REMOTE_DIR%/package-lock.json"
echo Termine.
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
ssh root@%VPS_HOST% -p %VPS_PORT% "echo \"nameserver 2001:4860:4860::6464\" > /etc/resolv.conf"
echo DNS restaures.
pause
goto menu

:gitpull
cls
echo Mise a jour depuis GitHub...
ssh root@%VPS_HOST% -p %VPS_PORT% "cd %REMOTE_DIR% && git -c http.sslVerify=false pull https://github.com.ip6.name/Zexaaaal/VaeBot.git master && npm install --no-bin-links && pm2 restart qi-bot"
echo.
echo TERMINE !
pause
goto menu
