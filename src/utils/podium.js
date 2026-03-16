const { createCanvas, loadImage } = require('canvas');
const path = require('path');

async function createPodiumImage(results, client) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load background image (optional, we could use a gradient or the oscar bg)
    try {
        const bgPath = path.join(__dirname, '../../oscarsbg.png');
        const bg = await loadImage(bgPath);
        ctx.globalAlpha = 0.3;
        ctx.drawImage(bg, 0, 0, 800, 400);
        ctx.globalAlpha = 1.0;
    } catch (e) {
        // Fallback to gradient if image not found
        const grad = ctx.createLinearGradient(0, 0, 0, 400);
        grad.addColorStop(0, '#1a1a1a');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 800, 400);
    }

    const positions = [
        { x: 400, y: 150, size: 120, label: '1st', color: '#d4af37' }, // Winner (Center)
        { x: 200, y: 200, size: 100, label: '2nd', color: '#c0c0c0' }, // 2nd (Left)
        { x: 600, y: 220, size: 90, label: '3rd', color: '#cd7f32' }    // 3rd (Right)
    ];

    for (let i = 0; i < Math.min(results.length, 3); i++) {
        const pos = positions[i];
        const res = results[i];

        // Draw avatar circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        try {
            let avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
            if (res.discord_id) {
                const user = await client.users.fetch(res.discord_id).catch(() => null);
                if (user) avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
            }
            const avatar = await loadImage(avatarUrl);
            ctx.drawImage(avatar, pos.x - pos.size / 2, pos.y - pos.size / 2, pos.size, pos.size);
        } catch (e) {
            ctx.fillStyle = '#555';
            ctx.fillRect(pos.x - pos.size / 2, pos.y - pos.size / 2, pos.size, pos.size);
        }
        ctx.restore();

        // Border
        ctx.strokeStyle = pos.color;
        ctx.lineWidth = 5;
        ctx.stroke();

        // Label (1st, 2nd, 3rd)
        ctx.fillStyle = pos.color;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(pos.label, pos.x, pos.y + pos.size / 2 + 30);

        // Name
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText(res.name, pos.x, pos.y + pos.size / 2 + 60);
    }

    return canvas.toBuffer();
}

module.exports = { createPodiumImage };
