const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // Check for the target channel
        const targetChannel = await client.channels.fetch(config.TARGET_CHANNEL_ID).catch(() => null);
        if (!targetChannel) {
            console.log("Dedicated channel not found. Please verify TARGET_CHANNEL_ID in config.");
            return;
        }

        // Fetch members to initialize their QI to 100 in database
        await targetChannel.guild.members.fetch();
        const { getUserInfo } = require('../database');
        targetChannel.guild.members.cache.forEach(member => {
            if (!member.user.bot) {
                getUserInfo(member.id);
            }
        });

        // Try to find if we already posted rules
        const messages = await targetChannel.messages.fetch({ limit: 10 });
        const botMessages = messages.filter(m => m.author.id === client.user.id);

        let rulesEmbedMsg = null;
        for (const msg of botMessages.values()) {
            if (msg.embeds.length > 0) {
                const title = msg.embeds[0].title || '';
                if (title.includes('Système de QI')) {
                    rulesEmbedMsg = msg;
                    break;
                }
            }
        }

        const embedBuilder = new EmbedBuilder()
            .setTitle('Système de QI')
            .setDescription('Chaque utilisateur commence avec 0 de QI.\n\nUtilisez la commande `/qi vote` pour attribuer un bonus ou malus (réservé aux décisionnaires avec le rôle QI).\nUtilisez la commande `/qi roll` (une fois toutes les 48h) pour un effet aléatoire.\nUtilisez la commande `/qi rank` pour afficher le scoreboard.\nUtilisez la commande `/qi points` pour afficher vos points.')
            .setColor(0x0099FF);

        if (rulesEmbedMsg) {
            await rulesEmbedMsg.edit({ embeds: [embedBuilder] });
        } else {
            await targetChannel.send({ embeds: [embedBuilder] });
        }

        // --- Update old Roll Embeds ---
        const rollMsg = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title && m.embeds[0].title.includes('🎲 Tirages -'));

        if (rollMsg) {
            const now = new Date();
            const nowTime = now.getTime();
            const PARIS_OFFSET = 1 * 60 * 60 * 1000;
            const nowParis = new Date(nowTime + PARIS_OFFSET);
            const day = nowParis.getUTCDate();
            const month = nowParis.getUTCMonth();
            const year = nowParis.getUTCFullYear();
            let endDay = (day % 2 === 1) ? day + 2 : day + 1;
            const cycleEnd = Date.UTC(year, month, endDay, 0, 0, 0) - PARIS_OFFSET;
            const cycleStart = cycleEnd - (48 * 60 * 60 * 1000);

            if (rollMsg.createdTimestamp < cycleStart) {
                const dailyTitle = `🎲 Tirages - Fin <t:${Math.floor(cycleEnd / 1000)}:R>`;
                const resetEmbed = EmbedBuilder.from(rollMsg.embeds[0])
                    .setTitle(dailyTitle)
                    .setDescription("Aucun tirage pour ce cycle.")
                    .setColor(0x0099FF);
                await rollMsg.edit({ embeds: [resetEmbed] }).catch(() => null);
            }
        }
    }
};
