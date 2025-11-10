import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".ts") || file.endsWith(".js"));
for (const file of commandFiles) {
    const filePath = new URL(`./commands/${file}`, import.meta.url).href;
    const command = await import(filePath);
    client.commands.set(command.data.name, command);
    console.log(`Loaded command: ${command.data.name}`);
}
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand())
        return;
    if (!client.commands)
        return;
    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.log(`Command not found: ${interaction.commandName}`);
        return;
    }
    console.log(`Executing command: ${interaction.commandName}`);
    try {
        await command.execute(interaction);
    }
    catch (error) {
        console.error(error);
        await interaction.reply({ content: "Error executing command.", ephemeral: true });
    }
});
client.once("ready", () => {
    console.log(`Logged in as ${client.user?.tag}`);
    console.log(`Loaded ${client.commands?.size || 0} command(s)`);
});
client.login(process.env.BOT_TOKEN);
