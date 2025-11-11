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
          "**CVV 0.00$ Authorization - Moneris gateway.**\n**Usage:** `/cvv card:CC|MM|YYYY|CVV`\n`",
        inline: false,
      },
      {
        name: "`/pp`",
        value:
          "**CCN 1-10$ Charge - Paypal Payflow Gateway.**\n**Usage:** `/pp card:CC|MM|YYYY|CVV`\n`",
        inline: false,
      },
      {
        name: "`/au`",
        value:
          "**CCN 1.00$ Charge - AVS Authnet Gateway.**\n**Usage:** `/au card:CC|MM|YYYY`\n`",
        inline: false,
      },
      {
        name: "`/payway`",
        value:
          "**CVV Custom Amount - Payway Gateway with reCAPTCHA v2.**\n**Usage:** `/payway card:CC|MM|YYYY|CVV amount:1.00`\n`",
        inline: false,
      },
      {
        name: "`/nevut`",
        value:
          "**CVV Charge - Nevut Gateway ($10.00-$12.00) with reCAPTCHA v2.**\n**Usage:** `/nevut card:CC|MM|YYYY|CVV`\n`",
        inline: false,
      }

    )
    .setTimestamp()
    .setFooter({ text: "Bot by EXO" });

  await interaction.reply({ embeds: [embed] });
}

