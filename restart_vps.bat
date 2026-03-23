@echo off
color 0b

echo ========================================================
echo             VPS Discord Bot Manager
echo ========================================================
echo IP : VPS-925156.ssh.vps1euro.fr (Port: 9739)
echo MDP: J7pn3Bqg (cliquez-droit pour coller !)
echo ========================================================
echo.
echo Mise a jour distant et redemarrage (pm2)...
echo.
ssh root@VPS-925156.ssh.vps1euro.fr -p 9739 "cd ~/discord_bot && git pull && npm install && pm2 restart all"

echo.
echo Termine.
pause
