require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const commands = [
  new SlashCommandBuilder()
    .setName("adddebt")
    .setDescription("Add debt")
    .addUserOption(option =>
      option
        .setName("debtor")
        .setDescription("the person who owes the money")
        .setRequired(true)
    )
    .addNumberOption(option =>
      option
        .setName("amount")
        .setDescription("how much they owe")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("the reason for this debt")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("debts")
    .setDescription("displays active debts"),

  new SlashCommandBuilder()
    .setName("paid")
    .setDescription("mark if debt is paid")
    .addIntegerOption(option =>
      option
        .setName("debt_id")
        .setDescription("the id of the debt")
        .setRequired(true)
    )
];

const commandData = commands.map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

async function deployCommands() {
  try {
    console.log("Registering slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commandData }
    );

    console.log("Slash commands registered successfully.");
  } catch (error) {
    console.error(error);
  }
}

deployCommands();