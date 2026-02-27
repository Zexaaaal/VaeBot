const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getUserInfo, calculateTotalQi, addModification, updateUserRollDate, getAllUsers, getLast7DaysLosses, getFirstRollTimestamp } = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qi')
        .setDescription('Gère le QI des utilisateurs')
        .addSubcommand(subcmd =>
            subcmd.setName('vote')
                .setDescription('Proposer un bonus ou un malus pour un utilisateur')
        )
        .addSubcommand(subcmd =>
            subcmd.setName('roll')
                .setDescription('Tire un bonus/malus aléatoire pour la journée')
        )
        .addSubcommand(subcmd =>
            subcmd.setName('rollreset')
                .setDescription('Bypass le daily roll pour tout le monde (admin)')
        )
        .addSubcommand(subcmd =>
            subcmd.setName('resetall')
                .setDescription('Reset le QI de tout le monde à 100 (admin)')
        )
        .addSubcommand(subcmd =>
            subcmd.setName('rank')
                .setDescription('Affiche le classement QI de tous les membres')
        )
        .addSubcommand(subcmd =>
            subcmd.setName('points')
                .setDescription('Affiche votre QI actuel')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'vote') {
            const memberRoles = interaction.member.roles.cache;
            if (!memberRoles.has(config.QI_ROLE_ID)) {
                return interaction.reply({ content: "Vous n'avez pas la permission de lancer un vote (rôle requis).", ephemeral: true });
            }

            if (interaction.channelId !== config.TARGET_CHANNEL_ID) {
                return interaction.reply({ content: `Cette commande doit être utilisée dans le salon dédié <#${config.TARGET_CHANNEL_ID}>.`, ephemeral: true });
            }

            // Fetch guild members to ensure they are cached
            await interaction.guild.members.fetch();

            let targetMembers = [];
            const vc = interaction.member.voice.channel;
            if (vc) {
                targetMembers = Array.from(vc.members.values()).filter(m => !m.user.bot);
            } else {
                targetMembers = Array.from(interaction.guild.members.cache.values()).filter(m => !m.user.bot).slice(0, 25);
            }

            if (targetMembers.length === 0) {
                return interaction.reply({ content: "Aucun utilisateur éligible trouvé.", ephemeral: true });
            }

            const userOptions = targetMembers.map(m => ({
                label: m.displayName,
                value: m.id
            })).slice(0, 25);

            const userSelect = new StringSelectMenuBuilder()
                .setCustomId('vote_select_user')
                .setPlaceholder('1. Sélectionnez un membre')
                .addOptions(userOptions);

            const malusOptions = config.MALUS_LIST.map(m => ({
                label: `${m.label} (${m.points})`,
                value: `${m.points}|Malus: ${m.label}`
            }));

            const malusSelect = new StringSelectMenuBuilder()
                .setCustomId('vote_select_malus')
                .setPlaceholder('2. Sélectionner un malus (optionnel)')
                .addOptions(malusOptions);

            const bonusOptions = config.BONUS_LIST.map(m => ({
                label: `${m.label} (+${m.points})`,
                value: `${m.points}|Bonus: ${m.label}`
            }));

            const bonusSelect = new StringSelectMenuBuilder()
                .setCustomId('vote_select_bonus')
                .setPlaceholder('3. Sélectionner un bonus (optionnel)')
                .addOptions(bonusOptions);

            const row1 = new ActionRowBuilder().addComponents(userSelect);
            const row2 = new ActionRowBuilder().addComponents(malusSelect);
            const row3 = new ActionRowBuilder().addComponents(bonusSelect);

            const confirmBtn = new ButtonBuilder()
                .setCustomId('vote_btn_start')
                .setLabel('Lancer le vote')
                .setStyle(ButtonStyle.Primary);

            const row4 = new ActionRowBuilder().addComponents(confirmBtn);

            await interaction.reply({
                content: "Configurez le vote de QI. Sélectionnez au moins un utilisateur et un effet, puis lancez le vote :",
                components: [row1, row2, row3, row4],
                ephemeral: true
            });

        } else if (subcommand === 'roll') {
            const userId = interaction.user.id;
            const user = getUserInfo(userId);

            if (user.last_roll_date) {
                const lastRoll = new Date(user.last_roll_date);
                const now = new Date();
                const diffTime = now.getTime() - lastRoll.getTime();
                const diffHours = diffTime / (1000 * 60 * 60);

                if (diffHours < 48) {
                    const remaining = Math.ceil(48 - diffHours);
                    return interaction.reply({ content: `Vous avez déjà utilisé votre tirage ! Revenez dans environ ${remaining} heure(s).`, ephemeral: true });
                }
            }

            const randomEvent = config.DAILY_ROLL_EVENTS[Math.floor(Math.random() * config.DAILY_ROLL_EVENTS.length)];

            const now = new Date();
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

            addModification(userId, randomEvent.points, `Roll: ${randomEvent.label}`, endOfDay.toISOString());
            updateUserRollDate(userId, now.toISOString());

            const currentQi = calculateTotalQi(userId);

            const rollLine = `<@${userId}> a roll *${randomEvent.label}* (${randomEvent.points > 0 ? '+' : ''}${randomEvent.points})`;

            await interaction.reply({ content: `🎲 Tirage effectué : **${randomEvent.label}**`, ephemeral: true });

            const targetChannelId = config.TARGET_CHANNEL_ID;
            if (targetChannelId) {
                const channel = await interaction.client.channels.fetch(targetChannelId).catch(() => null);
                if (channel) {
                    const messages = await channel.messages.fetch({ limit: 50 });

                    // Find existing roll embed (any that starts with 🎲 Tirages -)
                    let dailyMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0 && m.embeds[0].title && m.embeds[0].title.startsWith('🎲 Tirages -'));

                    // Check if existing embed is older than 48h
                    if (dailyMsg) {
                        const firstRoll = getFirstRollTimestamp();
                        if (firstRoll) {
                            const firstRollDate = new Date(firstRoll);
                            const now = new Date();
                            const diffHours = (now.getTime() - firstRollDate.getTime()) / (1000 * 60 * 60);
                            if (diffHours >= 48) {
                                // Delete old embed and clear roll dates to start a new cycle
                                await dailyMsg.delete().catch(() => null);
                                const { clearAllRollDates } = require('../database');
                                clearAllRollDates();
                                // Re-set current user's roll date since they just rolled
                                updateUserRollDate(userId, new Date().toISOString());
                                dailyMsg = null;
                            }
                        }
                    }

                    const nowDate = new Date();
                    const dateStr = nowDate.toLocaleDateString('fr-FR');
                    const dailyTitle = `🎲 Tirages - ${dateStr}`;

                    if (dailyMsg) {
                        const oldEmbed = dailyMsg.embeds[0];
                        const newDesc = oldEmbed.description + '\n' + rollLine;
                        const newEmbed = EmbedBuilder.from(oldEmbed).setDescription(newDesc);
                        await dailyMsg.edit({ embeds: [newEmbed] });
                    } else {
                        const newEmbed = new EmbedBuilder()
                            .setTitle(dailyTitle)
                            .setDescription(rollLine)
                            .setColor(0x0099FF);
                        await channel.send({ embeds: [newEmbed] });
                    }
                }
            }

            let vc = interaction.member?.voice?.channel;
            if (!vc) {
                // Try to find the user in any voice channel
                for (const channel of interaction.guild.channels.cache.values()) {
                    if (channel.isVoiceBased() && channel.members.has(userId)) {
                        vc = channel;
                        break;
                    }
                }
            }
            if (vc) {
                const { updateChannelStatus } = require('../utils/statusUpdater');
                updateChannelStatus(vc);
            }
        } else if (subcommand === 'rollreset') {
            if (interaction.user.id !== '219581513119825931') {
                return interaction.reply({ content: "Vous n'êtes pas autorisé à utiliser cette commande.", ephemeral: true });
            }
            const { clearAllRollDates } = require('../database');
            clearAllRollDates();
            await interaction.reply({ content: "Les tirages ont été réinitialisés pour tout le monde !", ephemeral: true });
        } else if (subcommand === 'resetall') {
            if (interaction.user.id !== '219581513119825931') {
                return interaction.reply({ content: "Vous n'êtes pas autorisé à utiliser cette commande.", ephemeral: true });
            }
            const { resetAllQi } = require('../database');
            resetAllQi();

            await interaction.reply({ content: "✅ Le QI de tous les membres a été réinitialisé à 100.", ephemeral: true });

            // Update all VCs that have at least one user
            const { updateChannelStatus } = require('../utils/statusUpdater');
            for (const channel of interaction.guild.channels.cache.values()) {
                if (channel.isVoiceBased() && channel.members.size > 0 && channel.members.some(m => !m.user.bot)) {
                    updateChannelStatus(channel);
                }
            }
        } else if (subcommand === 'rank') {
            const allUsers = getAllUsers();
            const rows = [];

            for (const u of allUsers) {
                const member = interaction.guild.members.cache.get(u.id);
                if (!member || member.user.bot) continue;
                const qi = calculateTotalQi(u.id);
                const losses = getLast7DaysLosses(u.id);
                rows.push({ name: member.displayName, qi, losses });
            }

            rows.sort((a, b) => b.qi - a.qi);

            let table = '```\n';
            table += 'Pseudo'.padEnd(20) + 'QI'.padStart(6) + '  7j perdu'.padStart(10) + '\n';
            table += '─'.repeat(36) + '\n';
            for (const row of rows) {
                const lossStr = row.losses < 0 ? `${row.losses}` : '0';
                table += row.name.slice(0, 18).padEnd(20) + String(row.qi).padStart(6) + lossStr.padStart(10) + '\n';
            }
            table += '```';

            const embed = new EmbedBuilder()
                .setTitle('🏆 Classement QI')
                .setDescription(table)
                .setColor(0x0099FF);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else if (subcommand === 'points') {
            const userId = interaction.user.id;
            getUserInfo(userId);
            const qi = calculateTotalQi(userId);

            const embed = new EmbedBuilder()
                .setTitle('🧠 Votre QI')
                .setDescription(`Vous avez actuellement **${qi}** de QI.`)
                .setColor(qi >= 100 ? 0x00FF00 : 0xFF0000);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
