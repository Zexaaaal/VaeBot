const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const { getOscarsCategories, getOscarsResults, db } = require('../database');
const { createPodiumImage } = require('../utils/podium');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oscars')
        .setDescription('Manage Oscars voting and results')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('reveal')
                .setDescription('Reveal the results of a category')
                .addIntegerOption(opt => opt.setName('category_id').setDescription('ID of the category').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('add_category')
                .setDescription('Add a new category')
                .addStringOption(opt => opt.setName('name').setDescription('Name of the category').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('add_nominee')
                .setDescription('Add a nominee to a category')
                .addIntegerOption(opt => opt.setName('category_id').setDescription('Category ID').setRequired(true))
                .addStringOption(opt => opt.setName('name').setDescription('Display name').setRequired(true))
                .addUserOption(opt => opt.setName('user').setDescription('Discord user (optional)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all categories and nominees')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add_category') {
            const name = interaction.options.getString('name');
            const info = db.prepare('INSERT INTO oscars_categories (name) VALUES (?)').run(name);
            return interaction.reply({ content: `Catégorie "${name}" ajoutée avec l'ID **${info.lastInsertRowid}**.`, ephemeral: true });
        }

        if (subcommand === 'add_nominee') {
            const categoryId = interaction.options.getInteger('category_id');
            const name = interaction.options.getString('name');
            const user = interaction.options.getUser('user');
            
            db.prepare('INSERT INTO oscars_nominees (category_id, name, discord_id) VALUES (?, ?, ?)').run(categoryId, name, user ? user.id : null);
            return interaction.reply({ content: `Nominé "${name}" ajouté à la catégorie ${categoryId}.`, ephemeral: true });
        }

        if (subcommand === 'list') {
            const categories = db.prepare('SELECT * FROM oscars_categories').all();
            let response = "### Catégories des Oscars :\n";
            for (const cat of categories) {
                response += `**${cat.id}. ${cat.name}** (Revealed: ${cat.is_revealed ? 'Yes' : 'No'})\n`;
                const nominees = db.prepare('SELECT * FROM oscars_nominees WHERE category_id = ?').all(cat.id);
                nominees.forEach(n => response += `  - ${n.name} (ID: ${n.id})\n`);
            }
            // Cut to respect 2000 max discord char limit per message 
            if (response.length > 1999) {
                response = response.substring(0, 1990) + '...';
            }
            return interaction.reply({ content: response, ephemeral: true });
        }

        if (subcommand === 'reveal') {
            await interaction.deferReply();
            const categoryId = interaction.options.getInteger('category_id');
            
            const category = db.prepare('SELECT * FROM oscars_categories WHERE id = ?').get(categoryId);
            if (!category) return interaction.editReply("Catégorie introuvable.");

            const results = getOscarsResults(categoryId);
            if (results.length === 0) return interaction.editReply("Aucun résultat pour cette catégorie.");

            const imageBuffer = await createPodiumImage(results, interaction.client);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'podium.png' });

            const winner = results[0];
            const embed = new EmbedBuilder()
                .setTitle(`🏆 RÉSULTATS : ${category.name.toUpperCase()}`)
                .setDescription(`Et le grand vainqueur est... **${winner.name}** ! 🎊`)
                .setColor('#d4af37')
                .setImage('attachment://podium.png')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], files: [attachment] });
            
            // Mark as revealed
            db.prepare('UPDATE oscars_categories SET is_revealed = 1 WHERE id = ?').run(categoryId);
        }
    }
};
