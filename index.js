const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  MessageFlags
} = require("discord.js");

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});


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
    .addNumberOption(option => option
        .setName("amount")
        .setDescription("how much they owe")
        .setRequired(true)
    )
    .addStringOption(option => option
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
    .addIntegerOption(option => option
        .setName("debt_id")
        .setDescription("the id of the debt")
        .setRequired(true)
    )


]

const commandData = commands.map(command => command.toJSON());

function formatMoney(amountCents) {
  return `$${(amountCents / 100).toFixed(2)}`;
}


client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const allowedChannelId = process.env.ALLOWED_CHANNEL_ID;

  if (interaction.channelId !== allowedChannelId) {
    return await interaction.reply({
      content: `Please use this bot in <#${allowedChannelId}>.`,
      flags: MessageFlags.Ephemeral
    });
  }

 
    switch (interaction.commandName){
        case "adddebt": {
            const debtor = interaction.options.getUser("debtor")
            const amount = interaction.options.getNumber("amount")
            const reason = interaction.options.getString("reason")
            if (amount <= 0){
                return await interaction.reply({
                    content: "amount must be greater than $0",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (debtor.id === interaction.user.id){
                return await interaction.reply({
                    content: "debtor must be different than the creditor",
                    flags: MessageFlags.Ephemeral
                });
            }
            if (reason.trim() === ""){
                return await interaction.reply({
                    content: "reason cannot be blank",
                    flags: MessageFlags.Ephemeral
                });
            }

            const amountCents = Math.round(amount * 100); 

            const { data, error } = await supabase
                .from("debts")
                .insert({
                    guild_id: interaction.guildId,
                    channel_id: interaction.channelId,
                    debtor_id: debtor.id,
                    creditor_id: interaction.user.id,
                    amount_cents: amountCents,
                    reason: reason.trim(),
                    paid: false
                })
                .select()
                .single();

                if (error) {
                console.error(error);

                return await interaction.reply({
                    content: "Database error while adding debt.",
                    flags: MessageFlags.Ephemeral
                });
                }

                await interaction.reply(
                `Debt #${data.id} added: ${debtor} owes you ${formatMoney(data.amount_cents)} for ${data.reason}.`
                );


            break;
        }
        case "debts": {
            const { data: unpaidDebts, error } = await supabase
                .from("debts")
                .select("*")
                .eq("guild_id", interaction.guildId)
                .eq("paid", false)
                .order("id", { ascending: true });

                if (error) {
                console.error(error);

                return await interaction.reply({
                    content: "Database error while loading debts.",
                    flags: MessageFlags.Ephemeral
                });
                }

            if (unpaidDebts.length === 0){
                return await interaction.reply("There are no unpaid debts right now.");
            }
            const debtMessage = unpaidDebts
                .map(debt => {
                    return `Debt #${debt.id}: <@${debt.debtor_id}> owes <@${debt.creditor_id}> ${formatMoney(debt.amount_cents)} for ${debt.reason}`;
                })
                .join("\n")

            await interaction.reply(debtMessage);

            break;
            }


        case "paid":{
            const debtId = interaction.options.getInteger("debt_id")
            const { data: debt, error: findError } = await supabase
                .from("debts")
                .select("*")
                .eq("id", debtId)
                .eq("guild_id", interaction.guildId)
                .single();
            if (findError || !debt){
                return await interaction.reply({
                    content: "enter valid debt id",
                    flags: MessageFlags.Ephemeral
                });
            }
            if (debt.creditor_id !== interaction.user.id){
                return await interaction.reply({
                    content: "only the creditor can mark debt as paid",
                    flags: MessageFlags.Ephemeral
                })
            }
            if (debt.paid === true){
                return await interaction.reply({
                    content: "This debt was already paid",
                    flags: MessageFlags.Ephemeral
                });
            }


            const { error: updateError } = await supabase
                .from("debts")
                .update({
                    paid: true,
                    paid_at: new Date().toISOString()
                })
                .eq("id", debtId)
                .eq("guild_id", interaction.guildId);

                if (updateError) {
                console.error(updateError);

                return await interaction.reply({
                    content: "Database error while marking debt as paid.",
                    flags: MessageFlags.Ephemeral
                });
                }

                await interaction.reply(`Debt #${debt.id} has been marked as paid`);
            break;
        }
            
            
    }
    });


client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);

  setInterval(async () => {
    const { data: unpaidDebts, error } = await supabase
      .from("debts")
      .select("*")
      .eq("paid", false);

    if (error) {
      console.error("Reminder database error:", error);
      return;
    }

    for (const debt of unpaidDebts) {
      const channel = await client.channels.fetch(process.env.ALLOWED_CHANNEL_ID);

      await channel.send(
        `<@${debt.debtor_id}> reminder: you still owe <@${debt.creditor_id}> ${formatMoney(debt.amount_cents)} for ${debt.reason}.`
      );
    }
  }, 24 * 60 * 60 * 1000);
});

client.login(process.env.DISCORD_TOKEN);
