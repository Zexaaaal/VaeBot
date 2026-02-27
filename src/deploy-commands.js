const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { REST, Routes } = require('discord.js');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    commands.push(command.data.toJSON());
}

if (!process.env.DISCORD_TOKEN) {
    console.error("Missing DISCORD_TOKEN in .env file! Cannot deploy commands.");
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        let route = Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);
        // Clear global commands first to prevent duplicates
        console.log("Clearing Global Commands to avoid duplicates...");
        await rest.put(route, { body: [] });

        if (process.env.DISCORD_GUILD_ID) {
            console.log("Using Guild Commands deployment...");
            const guildRoute = Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID);
            const data = await rest.put(guildRoute, { body: commands });
            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } else {
            console.log("Updating Global Commands deployment...");
            const data = await rest.put(route, { body: commands });
            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        }
    } catch (error) {
        console.error(error);
    }
})();
