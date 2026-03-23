const { Events } = require('discord.js');
const config = require('../config');
const { clearAllRollDates, resetAllQi, updateBaseQi, setBaseQi, calculateTotalQi } = require('../database');
const { updateChannelStatus } = require('../utils/statusUpdater');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (message.author.id !== config.OWNER_ID) return;
        if (!message.content.startsWith('!qi')) return;

        const args = message.content.slice(3).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();

        if (command === 'add' || command === 'set') {
            const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
            const value = parseInt(args[1]);

            message.delete().catch(() => null);

            if (!targetUser || isNaN(value)) {
                const msg = await message.channel.send(`Usage : \`!qi ${command} @utilisateur/-ID <valeur>\``);
                return setTimeout(() => msg.delete().catch(() => null), 5000);
            }

            let newTotalQi;
            if (command === 'add') {
                updateBaseQi(targetUser.id, value);
                newTotalQi = calculateTotalQi(targetUser.id);
                const replyMsg = await message.channel.send(`Le QI de <@${targetUser.id}> a été modifié de **${value > 0 ? '+' : ''}${value}**. Nouveau QI Total : **${newTotalQi}**.`);
                setTimeout(() => replyMsg.delete().catch(() => null), 5000);
            } else {
                const currentTotal = calculateTotalQi(targetUser.id);
                const diff = value - currentTotal;
                updateBaseQi(targetUser.id, diff);
                newTotalQi = value;
                const replyMsg = await message.channel.send(`Le QI de <@${targetUser.id}> a été forcé à **${value}** (total actuel).`);
                setTimeout(() => replyMsg.delete().catch(() => null), 5000);
            }

            const member = message.guild.members.cache.get(targetUser.id);
            if (member?.voice?.channel) {
                updateChannelStatus(member.voice.channel);
            }
        }

        else if (command === 'rollreset') {
            message.delete().catch(() => null);
            clearAllRollDates();
            const replyMsg = await message.channel.send("Les tirages ont été réinitialisés pour tout le monde !");
            setTimeout(() => replyMsg.delete().catch(() => null), 5000);
        }

        else if (command === 'resetall') {
            message.delete().catch(() => null);
            resetAllQi();
            const replyMsg = await message.channel.send("Le QI de tous les membres a été réinitialisé à 0.");
            setTimeout(() => replyMsg.delete().catch(() => null), 5000);

            for (const channel of message.guild.channels.cache.values()) {
                if (channel.isVoiceBased() && channel.members.size > 0 && channel.members.some(m => !m.user.bot)) {
                    updateChannelStatus(channel);
                }
            }
        }

        else if (command === 'joinvc') {
            message.delete().catch(() => null);
            const channelId = args[0];
            if (!channelId) {
                const msg = await message.channel.send("Veuillez fournir un ID de salon vocal. Ex: `!qi joinvc 123456789`");
                return setTimeout(() => msg.delete().catch(() => null), 5000);
            }

            const channel = await message.client.channels.fetch(channelId).catch(() => null);
            if (!channel || !channel.isVoiceBased()) {
                const msg = await message.channel.send("Salon vocal introuvable ou ce n'est pas un salon vocal.");
                return setTimeout(() => msg.delete().catch(() => null), 5000);
            }

            const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
            const path = require('path');

            try {
                const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                    selfDeaf: false,
                    selfMute: false
                });

                const player = createAudioPlayer();
                connection.subscribe(player);

                const playVenboom = () => {
                    console.log('[AUDIO] Lancement de venboom.mp3');
                    const audioPath = path.join(__dirname, '../../venboom.mp3');
                    const resource = createAudioResource(audioPath);
                    player.play(resource);
                };

                // Sondes sur l'état du réseau Discord (UDP/NAT)
                connection.on('stateChange', (oldState, newState) => {
                    console.log(`[RESEAU VOCAL] Changement d'etat: ${oldState.status} => ${newState.status}`);
                    if (newState.status === 'disconnected') {
                        console.error('[RESEAU VOCAL] Le bot a ete deconnecte par Discord !');
                    }
                });

                playVenboom();

                player.on(AudioPlayerStatus.Idle, () => {
                    console.log('[AUDIO] Fin du fichier, on relance en boucle...');
                    playVenboom();
                });

                player.on(AudioPlayerStatus.Playing, () => {
                    console.log('[AUDIO] Le lecteur indique qu il est en train de LIRE le fichier');
                });

                player.on('error', error => {
                    console.error('[AUDIO ERROR] AudioPlayer Error:', error);
                    setTimeout(playVenboom, 5000); // 5 sec pause if error
                });

                const replyMsg = await message.channel.send(`Connecté au salon vocal **${channel.name}** ! Il y restera indéfiniment sans se déconnecter.`);
                setTimeout(() => replyMsg.delete().catch(() => null), 5000);
            } catch (error) {
                console.error(error);
                const replyMsg = await message.channel.send("Erreur lors de la connexion au salon vocal.");
                setTimeout(() => replyMsg.delete().catch(() => null), 5000);
            }
        }

        else if (command === 'pfp') {
            message.delete().catch(() => null);
            const attachment = message.attachments.first();
            const url = args[0];
            const isGlobal = args.includes('--global');
            const avatarUrl = attachment ? attachment.url : url;

            if (!avatarUrl) {
                const msg = await message.channel.send("Veuillez fournir une image (pièce jointe ou lien).");
                return setTimeout(() => msg.delete().catch(() => null), 5000);
            }

            try {
                if (isGlobal) {
                    await message.client.user.setAvatar(avatarUrl);
                    const msg = await message.channel.send("L'avatar global du bot a été mis à jour !");
                    setTimeout(() => msg.delete().catch(() => null), 5000);
                } else {
                    await message.guild.members.me.setAvatar(avatarUrl);
                    const msg = await message.channel.send("L'avatar du bot a été mis à jour pour ce serveur !");
                    setTimeout(() => msg.delete().catch(() => null), 5000);
                }
            } catch (error) {
                console.error(error);
                const msg = await message.channel.send("Erreur lors de la mise à jour de l'avatar.");
                setTimeout(() => msg.delete().catch(() => null), 5000);
            }
        }
    }
};
