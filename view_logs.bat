@echo off
color 0e

echo ========================================================
echo             VPS Discord Bot Logs
echo ========================================================
echo IP : VPS-925156.ssh.vps1euro.fr (Port: 9739)
echo MDP: J7pn3Bqg (clic-droit pour coller)
echo ========================================================
echo Affichage des erreurs et logs du bot...
ssh root@VPS-925156.ssh.vps1euro.fr -p 9739 "pm2 logs qi-bot --lines 50"
pause
