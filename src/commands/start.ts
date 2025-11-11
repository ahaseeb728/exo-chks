import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("start")
  .setDescription("Display all available commands and their information");

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle("🤖 Available Commands")
    .setColor(0x0099ff)
    .setDescription("Here are all the available commands you can use:")
    .addFields(

      {
        name: "`/cvv`",
        value:
          "CVV 0.00$ Authorization - Moneris gateway.\n**Usage:** `/cvv card:CC|MM|YYYY|CVV`\n**Example:** `/cvv card:4111111111111111|12|2025|123`",
        inline: false,
      },
      {
        name: "`/pp`",
        value:
          "PayPal 1-10$ Charge - Paypal Payflow Gateway.\n**Usage:** `/pp card:CC|MM|YYYY|CVV`\n**Example:** `/pp card:4111111111111111|12|2025`",
        inline: false,
      },
      {
        name: "`/au`",
        value:
          "Authnet 4.70$ Charge - AVS Authnet Gateway.\n**Usage:** `/au card:CC|MM|YYYY`\n**Example:** `/au card:4111111111111111|12|2025`",
        inline: false,
      },
      {
        name: "`/payway`",
        value:
          "PayWay Gateway - Custom amount charge with reCAPTCHA v2.\n**Usage:** `/payway card:CC|MM|YYYY|CVV amount:1.00`\n**Example:** `/payway card:4111111111111111|12|2025|123 amount:1.00`",
        inline: false,
      }

    )
    .setTimestamp()
    .setFooter({ text: "Bot by EXO" });

  await interaction.reply({ embeds: [embed] });
}

