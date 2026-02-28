const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getUserInfo, calculateTotalQi, addModification, updateUserRollDate, getAllUsers, getLast7DaysLosses, getFirstRollTimestamp } = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qi')
        .setDescription('Gère le QI des utilisateurs')
        .addSubcommand(subcmd =>
            subcmd.setName('vote')
                .setDescription('Le châtiment suprême... ou la grâce divine')
        )
        .addSubcommand(subcmd =>
            subcmd.setName('roll')
                .setDescription('Un bonbon ou une bombe?')
        )
        .addSubcommand(subcmd =>
            subcmd.setName('rank')
                .setDescription('Le classement QI de tous les membres')
        )
        .addSubcommand(subcmd =>
            subcmd.setName('points')
                .setDescription('QI actuel')
        ),
    async execute(interaction) {
        if (interaction.guildId !== config.ALLOWED_GUILD_ID) {
            return interaction.reply({ content: "Cette fonctionnalité n'est pas activée sur ce serveur.", ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'vote') {
            const memberRoles = interaction.member.roles.cache;
            if (!memberRoles.has(config.QI_ROLE_ID)) {
                return interaction.reply({ content: "Vous n'avez pas la permission de lancer un vote (rôle requis).", ephemeral: true });
            }

            if (interaction.channelId !== config.TARGET_CHANNEL_ID) {
                return interaction.reply({ content: `Cette commande doit être utilisée dans le salon dédié <#${config.TARGET_CHANNEL_ID}>.`, ephemeral: true });
            }

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

            // Logic: 48h cycles starting from the 1st of each month (1st-2nd, 3rd-4th, ...)
            const now = new Date();
            const dayOfMonth = now.getDate();

            // Calculate when the next 2-day block starts (at 00:00)
            const isFirstDayOfBlock = (dayOfMonth % 2 === 1);
            const cycleEndDay = isFirstDayOfBlock ? dayOfMonth + 2 : dayOfMonth + 1;

            // We create the date at 00:00 (local VPS time, usually UTC)
            // Then we subtract 1 hour to target 00:00 Paris (UTC+1)
            const cycleEndLocalDate = new Date(now.getFullYear(), now.getMonth(), cycleEndDay, 0, 0, 0);
            const cycleEnd = cycleEndLocalDate.getTime() - (1 * 60 * 60 * 1000);
            const nowTime = now.getTime();
            const cycleStart = cycleEnd - (48 * 60 * 60 * 1000);

            if (user.last_roll_date) {
                const lastRoll = new Date(user.last_roll_date).getTime();
                if (lastRoll >= cycleStart) {
                    return interaction.reply({ content: `Vous avez déjà utilisé votre tirage pour ce cycle ! Revenez **<t:${Math.floor(cycleEnd / 1000)}:R>**.`, ephemeral: true });
                }
            }

            const randomEvent = config.DAILY_ROLL_EVENTS[Math.floor(Math.random() * config.DAILY_ROLL_EVENTS.length)];

            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

            addModification(userId, randomEvent.points, `Roll: ${randomEvent.label}`, endOfDay.toISOString());
            updateUserRollDate(userId, now.toISOString());

            const currentQi = calculateTotalQi(userId);

            const rollLine = `<@${userId}> a roll *${randomEvent.label}* (${randomEvent.points > 0 ? '+' : ''}${randomEvent.points})`;

            await interaction.reply({ content: `Tirage effectué : **${randomEvent.label}**`, ephemeral: true });

            const targetChannelId = config.TARGET_CHANNEL_ID;
            if (targetChannelId) {
                const channel = await interaction.client.channels.fetch(targetChannelId).catch(() => null);
                if (channel) {
                    const messages = await channel.messages.fetch({ limit: 50 });

                    // Find existing roll embed
                    let dailyMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0 && m.embeds[0].title && m.embeds[0].title.startsWith('🎲 Tirages -'));

                    // Check if existing embed is from a previous cycle
                    if (dailyMsg) {
                        const msgTimestamp = dailyMsg.createdTimestamp;
                        if (msgTimestamp < cycleStart) {
                            await dailyMsg.delete().catch(() => null);
                            dailyMsg = null;
                        }
                    }

                    const dailyTitle = `🎲 Tirages - Fin <t:${Math.floor(cycleEnd / 1000)}:R>`;

                    if (dailyMsg) {
                        const oldEmbed = dailyMsg.embeds[0];
                        const newDesc = oldEmbed.description + '\n' + rollLine;
                        const newEmbed = EmbedBuilder.from(oldEmbed)
                            .setTitle(dailyTitle)
                            .setDescription(newDesc);
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
        } else if (subcommand === 'rank') {
            const allUsers = getAllUsers();
            const rows = [];

            for (const u of allUsers) {
                const member = interaction.guild.members.cache.get(u.id);
                if (!member || member.user.bot) continue;
                const qi = calculateTotalQi(u.id);
                if (qi === 0) continue; // Exclude users with no fluctuations (exactly 0)
                const losses = getLast7DaysLosses(u.id);
                rows.push({ name: member.displayName, qi, losses });
            }

            rows.sort((a, b) => b.qi - a.qi);

            let table = '```\n';
            table += 'Pseudo'.padEnd(20) + 'QI'.padStart(6) + '  7j perdu'.padStart(10) + '\n';
            table += '─'.repeat(38) + '\n';
            if (rows.length === 0) {
                table += 'Aucun utilisateur avec des points.\n';
            } else {
                for (const row of rows) {
                    const lossStr = row.losses < 0 ? `${row.losses}` : '0';
                    table += row.name.slice(0, 18).padEnd(20) + String(row.qi).padStart(6) + lossStr.padStart(10) + '\n';
                }
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
                .setTitle('Votre QI')
                .setDescription(`Vous avez actuellement **${qi}** de QI.`)
                .setColor(qi >= 0 ? 0x00FF00 : 0xFF0000);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
