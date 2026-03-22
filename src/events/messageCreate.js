const { Events } = require('discord.js');
const config = require('../config');
const { clearAllRollDates, resetAllQi, updateBaseQi } = require('../database');
const { updateChannelStatus } = require('../utils/statusUpdater');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (message.author.id !== config.OWNER_ID) return;
        if (!message.content.startsWith('!qi')) return;

        const args = message.content.slice(3).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();

        if (command === 'set') {
            const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
            const value = parseInt(args[1]);

            if (!targetUser || isNaN(value)) {
                return message.reply("Usage : `!qi set @utilisateur/-ID <valeur>`");
            }

            const newQi = updateBaseQi(targetUser.id, value);
            await message.reply(`Le QI de <@${targetUser.id}> a été modifié de **${value}**. Nouveau QI de base : **${newQi}**.`);

            const member = message.guild.members.cache.get(targetUser.id);
            if (member?.voice?.channel) {
                updateChannelStatus(member.voice.channel);
            }
        }

        else if (command === 'rollreset') {
            clearAllRollDates();
            await message.reply("Les tirages ont été réinitialisés pour tout le monde !");
        }

        else if (command === 'resetall') {
            resetAllQi();
            await message.reply("Le QI de tous les membres a été réinitialisé à 0.");

            for (const channel of message.guild.channels.cache.values()) {
                if (channel.isVoiceBased() && channel.members.size > 0 && channel.members.some(m => !m.user.bot)) {
                    updateChannelStatus(channel);
                }
            }
        }

        else if (command === 'joinvc') {
            const channelId = args[0];
            if (!channelId) {
                return message.reply("Veuillez fournir un ID de salon vocal. Ex: `!qi joinvc 123456789`");
            }

            const channel = await message.client.channels.fetch(channelId).catch(() => null);
            if (!channel || !channel.isVoiceBased()) {
                return message.reply("Salon vocal introuvable ou ce n'est pas un salon vocal.");
            }

            const { joinVoiceChannel } = require('@discordjs/voice');

            try {
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                });
                await message.reply(`Connecté au salon vocal **${channel.name}** ! Il y restera jusqu'à son exclusion.`);
            } catch (error) {
                console.error(error);
                await message.reply("Erreur lors de la connexion au salon vocal.");
            }
        }

        else if (command === 'pfp') {
            const attachment = message.attachments.first();
            const url = args[0];
            const isGlobal = args.includes('--global');
            const avatarUrl = attachment ? attachment.url : url;

            if (!avatarUrl) {
                return message.reply("Veuillez fournir une image (pièce jointe ou lien).");
            }

            try {
                if (isGlobal) {
                    await message.client.user.setAvatar(avatarUrl);
                    await message.reply("L'avatar global du bot a été mis à jour !");
                } else {
                    await message.guild.members.me.setAvatar(avatarUrl);
                    await message.reply("L'avatar du bot a été mis à jour pour ce serveur !");
                }
            } catch (error) {
                console.error(error);
                await message.reply("Erreur lors de la mise à jour de l'avatar.");
            }
        }
    }
};
