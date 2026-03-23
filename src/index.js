require('dotenv').config();
const dns = require('dns');
// FORCAGE BRUTAL IPV6 - SOLUTION DE LA DERNIERE CHANCE
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
    if (typeof options === 'function') {
        callback = options;
        options = { family: 6 };
    } else if (typeof options === 'number') {
        options = { family: 6 };
    } else {
        options = Object.assign({}, options, { family: 6 });
    }
    return originalLookup(hostname, options, callback);
};
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { initDb } = require('./database');
const { startWebServer } = require('./web');
const { checkSpecialRoleExpiration } = require('./utils/roleManager');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();

initDb();
startWebServer();

checkSpecialRoleExpiration(client);
setInterval(() => {
    checkSpecialRoleExpiration(client);
}, 5 * 60 * 1000); // Check every 5 mins

const eventsPath = path.join(__dirname, 'events');
if (!fs.existsSync(eventsPath)) fs.mkdirSync(eventsPath);

const eventFiles = fs.existsSync(eventsPath) ? fs.readdirSync(eventsPath).filter(file => file.endsWith('.js')) : [];
for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath);

const commandFiles = fs.existsSync(commandsPath) ? fs.readdirSync(commandsPath).filter(file => file.endsWith('.js')) : [];
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
}

if (!process.env.DISCORD_TOKEN) {
    console.error("DISCORD_TOKEN is missing in .env file. Please provide it, otherwise the bot cannot start.");
} else {
    client.login(process.env.DISCORD_TOKEN);
}
