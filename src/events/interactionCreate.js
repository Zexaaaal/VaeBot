const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { updateBaseQi, calculateTotalQi } = require('../database');
const { updateChannelStatus } = require('../utils/statusUpdater');

// Temporary in-memory store for vote configurations
const voteConfigs = new Map();

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'Il y a eu une erreur lors de l\'exécution de cette commande!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Il y a eu une erreur lors de l\'exécution de cette commande!', ephemeral: true });
                }
            }
        } else if (interaction.isStringSelectMenu()) {
            const { customId, values, user } = interaction;
            if (!customId.startsWith('vote_')) return;

            let configT = voteConfigs.get(user.id) || {};

            // Need to reply to select menus to not show "Interaction failed"
            // Wait we used interaction.reply for the initial menu. Replying ephemeral "Choix enregistré" is good.
            // But if user clicks multiple times, we need to handle it. interaction.deferUpdate() is better.
            if (customId === 'vote_select_user') {
                configT.targetId = values[0];
            } else if (customId === 'vote_select_malus') {
                const [points, reason] = values[0].split('|');
                configT.malus = { points: parseInt(points), reason };
            } else if (customId === 'vote_select_bonus') {
                const [points, reason] = values[0].split('|');
                configT.bonus = { points: parseInt(points), reason };
            }

            voteConfigs.set(user.id, configT);
            await interaction.reply({ content: "Enregistré ✅", ephemeral: true });
            // Delete the reply after 2 seconds to keep it clean
            setTimeout(() => interaction.deleteReply().catch(() => null), 2000);

        } else if (interaction.isButton()) {
            if (interaction.customId === 'vote_btn_start') {
                const userConfig = voteConfigs.get(interaction.user.id);
                if (!userConfig || !userConfig.targetId) {
                    return interaction.reply({ content: "Vous devez d'abord sélectionner un utilisateur.", ephemeral: true });
                }
                if (!userConfig.malus && !userConfig.bonus) {
                    return interaction.reply({ content: "Vous devez sélectionner au moins un bonus ou un malus.", ephemeral: true });
                }

                const targetMember = await interaction.guild.members.fetch(userConfig.targetId);
                const displayName = targetMember ? targetMember.displayName : (await client.users.fetch(userConfig.targetId)).username;

                // Sum up points
                let totalPoints = 0;
                let reasons = [];
                if (userConfig.malus) {
                    totalPoints += userConfig.malus.points;
                    reasons.push(`${userConfig.malus.reason.replace(':', ' -')} (${userConfig.malus.points} QI)`);
                }
                if (userConfig.bonus) {
                    totalPoints += userConfig.bonus.points;
                    reasons.push(`${userConfig.bonus.reason.replace(':', ' -')} (+${userConfig.bonus.points} QI)`);
                }

                const embed = new EmbedBuilder()
                    .setTitle('⚖️ Vote de QI')
                    .setDescription(`Un vote est lancé pour **${displayName}** !\n\n**Modifications proposées :** ${reasons.join(' | ')}`)
                    .setColor(0xFFA500);

                const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('vote_yes').setLabel('Pour').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('vote_no').setLabel('Contre').setStyle(ButtonStyle.Danger)
                );

                const replyMessage = await interaction.channel.send({ embeds: [embed], components: [row] });

                await interaction.reply({ content: "Le vote est lancé", ephemeral: true });
                setTimeout(() => interaction.deleteReply().catch(() => null), 3000);

                // Wait for interactions (2 minutes = 120000 ms)
                const filter = i => {
                    if (i.user.bot) return false;
                    const member = interaction.guild.members.cache.get(i.user.id);
                    return member && member.roles.cache.has(config.QI_ROLE_ID);
                };

                const collector = replyMessage.createMessageComponentCollector({ filter, time: 120000 });
                const voters = new Set();
                let yesVotes = 0;
                let noVotes = 0;

                collector.on('collect', async i => {
                    if (voters.has(i.user.id)) {
                        await i.reply({ content: "Vous avez déjà voté.", ephemeral: true });
                        return;
                    }
                    voters.add(i.user.id);
                    if (i.customId === 'vote_yes') yesVotes++;
                    else if (i.customId === 'vote_no') noVotes++;
                    await i.reply({ content: "Votre vote a été pris en compte.", ephemeral: true });
                });

                collector.on('end', async () => {
                    // Remove buttons after vote
                    await replyMessage.edit({ components: [] }).catch(() => null);

                    if (yesVotes > noVotes) {
                        updateBaseQi(userConfig.targetId, totalPoints);
                        const currentQi = calculateTotalQi(userConfig.targetId);

                        const resultEmbed = new EmbedBuilder()
                            .setTitle('Motion approuvée')
                            .setDescription(`Le vote pour **${displayName}** est passé !\n\n**Modifications :** ${reasons.join(' | ')}\n\nNouveau QI total : **${currentQi}** 🧠`)
                            .setColor(0x00FF00);

                        await replyMessage.edit({ embeds: [resultEmbed] });

                        // Update VC status
                        let vc = targetMember?.voice?.channel;
                        if (!vc) {
                            for (const channel of interaction.guild.channels.cache.values()) {
                                if (channel.isVoiceBased() && channel.members.has(userConfig.targetId)) {
                                    vc = channel;
                                    break;
                                }
                            }
                        }
                        if (vc) {
                            updateChannelStatus(vc);
                        }
                    } else {
                        const resultEmbed = new EmbedBuilder()
                            .setTitle('Motion rejetée')
                            .setDescription(`Le vote pour **${displayName}** n'a pas retenu la majorité.`)
                            .setColor(0xFF0000);
                        await replyMessage.edit({ embeds: [resultEmbed] });
                    }
                });

                // clear config
                voteConfigs.delete(interaction.user.id);
            }
        }
    }
};
