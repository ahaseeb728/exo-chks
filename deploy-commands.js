
import 'dotenv/config';
import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const commands = [];
const commandsPath = path.join(__dirname, "dist", "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = new URL(`./dist/commands/${file}`, import.meta.url).href;
  const command = await import(filePath);
  commands.push(command.data.toJSON());
  console.log(`Loaded command: ${command.data.name}`);
}

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

try {
  console.log("Deploying slash commands...");
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("Done.");
} catch (error) {
  console.error(error);
}
