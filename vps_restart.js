const { Client } = require('ssh2');

const conn = new Client();
const config = {
    host: 'VPS-925156.ssh.vps1euro.fr',
    port: 9739,
    username: 'root',
    password: 'J7pn3Bqg'
};

console.log("Connexion au VPS en cours...");

conn.on('ready', () => {
    console.log("Connecté avec succès !");
    console.log("Recherche du dossier du bot et exécution des commandes de mise à jour...");

    // Tente de trouver le bot dans les dossiers habituels
    const cmd = `
        cd /root/VaeBot 2>/dev/null || cd /root/discord_bot 2>/dev/null || cd /home/discord_bot 2>/dev/null || cd ~/discord_bot 2>/dev/null;
        
        echo "Dossier actuel : $(pwd)"
        echo "Téléchargement des dernières mises à jour (git pull)..."
        git pull || echo "Erreur ou pas de git."
        
        echo "Installation des dépendances (au cas où)..."
        npm install
        
        echo "Redémarrage de l'application..."
        pm2 restart all || pm2 restart discord-qi-bot || node src/index.js
    `;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        
        stream.on('close', (code, signal) => {
            console.log("Terminé avec le code", code);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).on('error', (err) => {
    console.error("Erreur de connexion SSH : ", err.message);
}).connect(config);
