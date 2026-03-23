@echo off
setlocal enabledelayedexpansion
title VPS Bot Manager
color 0b

echo ========================================================
echo             VPS Discord Bot Manager
echo ========================================================
echo IP : VPS-925156.ssh.vps1euro.fr (Port: 9739)
echo.
echo [ATTENTION] Copiez ce mot de passe dans votre presse-papier :
echo J7pn3Bqg
echo (Pour coller dans la console SSH, faites simplement un CLIC DROIT)
echo ========================================================
echo.
echo Que souhaitez-vous faire ?
echo 1. Ouvrir une session SSH interactive (pour tout gerer manuellement)
echo 2. Envoyer la commande de redemarrage automatique via SSH
echo 3. Quitter
echo.

set /p choix="Entrez votre choix (1/2/3) : "

if "%choix%"=="1" (
    echo.
    echo Connexion en cours... (mot de passe requis)
    ssh root@VPS-925156.ssh.vps1euro.fr -p 9739
    goto fin
)

if "%choix%"=="2" (
    echo.
    set /p path="Entrez le chemin absolu du bot sur le VPS (ex: /root/discord_bot) : "
    set /p startcmd="Entrez la commande de redemarrage (ex: pm2 restart all) : "
    echo.
    echo Execution de : cd !path! ^&^& git pull ^&^& !startcmd!
    echo Connexion en cours... (mot de passe requis)
    ssh root@VPS-925156.ssh.vps1euro.fr -p 9739 "cd !path! && git pull && npm install && !startcmd!"
    goto fin
)

:fin
echo.
echo Termine.
pause
