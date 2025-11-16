import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { getLivesPage, getAllLives, formatCardDisplay } from "../utils/livesManager.js";

export const data = new SlashCommandBuilder()
  .setName("getlives")
  .setDescription("Get approved cards")
  .addStringOption((option) =>
    option
      .setName("mode")
      .setDescription("Display mode")
      .setRequired(false)
      .addChoices(
        { name: "Page (10 per page)", value: "page" },
        { name: "All", value: "all" }
      )
  )
  .addIntegerOption((option) =>
    option
      .setName("page")
      .setDescription("Page number (default: 1)")
      .setRequired(false)
      .setMinValue(1)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const mode = interaction.options.getString("mode") || "page";
  const pageNum = interaction.options.getInteger("page") || 1;

  if (mode === "all") {
    const allLives = getAllLives();
    
    if (allLives.length === 0) {
      await interaction.editReply({
        content: "❌ No approved cards found.",
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 All Approved Cards (${allLives.length} total)`)
      .setColor(0x00ff00)
      .setTimestamp();

    const cardTexts = allLives.map((card, index) => 
      `**${index + 1}.** ${formatCardDisplay(card)}`
    );

    // Discord embed field value limit is 1024 characters
    // Split into multiple fields if needed
    let currentField = "";
    let fieldCount = 0;
    const maxFieldLength = 1000;

    for (const cardText of cardTexts) {
      if (currentField.length + cardText.length + 2 > maxFieldLength) {
        embed.addFields({
          name: fieldCount === 0 ? "Cards" : `Cards (continued ${fieldCount})`,
          value: currentField || "No cards",
          inline: false,
        });
        currentField = cardText;
        fieldCount++;
      } else {
        currentField += (currentField ? "\n\n" : "") + cardText;
      }
    }

    if (currentField) {
      embed.addFields({
        name: fieldCount === 0 ? "Cards" : `Cards (continued ${fieldCount})`,
        value: currentField,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } else {
    const { lives, totalPages, currentPage } = getLivesPage(pageNum, 10);

    if (lives.length === 0) {
      await interaction.editReply({
        content: "❌ No approved cards found.",
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 Approved Cards (Page ${currentPage}/${totalPages})`)
      .setDescription(`Showing ${lives.length} card(s)`)
      .setColor(0x00ff00)
      .setFooter({ text: `Total: ${getAllLives().length} cards` })
      .setTimestamp();

    const cardTexts = lives.map((card, index) => {
      const globalIndex = (currentPage - 1) * 10 + index + 1;
      return `**${globalIndex}.** ${formatCardDisplay(card)}`;
    });

    // Split into fields if needed
    let currentField = "";
    let fieldCount = 0;
    const maxFieldLength = 1000;

    for (const cardText of cardTexts) {
      if (currentField.length + cardText.length + 2 > maxFieldLength) {
        embed.addFields({
          name: fieldCount === 0 ? "Cards" : `Cards (continued ${fieldCount})`,
          value: currentField || "No cards",
          inline: false,
        });
        currentField = cardText;
        fieldCount++;
      } else {
        currentField += (currentField ? "\n\n" : "") + cardText;
      }
    }

    if (currentField) {
      embed.addFields({
        name: fieldCount === 0 ? "Cards" : `Cards (continued ${fieldCount})`,
        value: currentField,
        inline: false,
      });
    }

    // Create pagination buttons
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("prev_page")
        .setLabel("◀ Previous")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 1),
      new ButtonBuilder()
        .setCustomId("next_page")
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === totalPages),
      new ButtonBuilder()
        .setCustomId("first_page")
        .setLabel("⏮ First")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 1),
      new ButtonBuilder()
        .setCustomId("last_page")
        .setLabel("Last ⏭")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === totalPages),
      new ButtonBuilder()
        .setCustomId("show_all")
        .setLabel("Show All")
        .setStyle(ButtonStyle.Success)
    );

    const response = await interaction.editReply({
      embeds: [embed],
      components: [row],
    });

    // Create collector for button interactions
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000, // 5 minutes
    });

    collector.on("collect", async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        await buttonInteraction.reply({
          content: "❌ This is not your command.",
          ephemeral: true,
        });
        return;
      }

      await buttonInteraction.deferUpdate();

      let newPage = currentPage;

      if (buttonInteraction.customId === "prev_page") {
        newPage = Math.max(1, currentPage - 1);
      } else if (buttonInteraction.customId === "next_page") {
        newPage = Math.min(totalPages, currentPage + 1);
      } else if (buttonInteraction.customId === "first_page") {
        newPage = 1;
      } else if (buttonInteraction.customId === "last_page") {
        newPage = totalPages;
      } else if (buttonInteraction.customId === "show_all") {
        collector.stop();
        const allLives = getAllLives();
        
        const allEmbed = new EmbedBuilder()
          .setTitle(`📋 All Approved Cards (${allLives.length} total)`)
          .setColor(0x00ff00)
          .setTimestamp();

        const cardTexts = allLives.map((card, index) => 
          `**${index + 1}.** ${formatCardDisplay(card)}`
        );

        let currentField = "";
        let fieldCount = 0;

        for (const cardText of cardTexts) {
          if (currentField.length + cardText.length + 2 > maxFieldLength) {
            allEmbed.addFields({
              name: fieldCount === 0 ? "Cards" : `Cards (continued ${fieldCount})`,
              value: currentField || "No cards",
              inline: false,
            });
            currentField = cardText;
            fieldCount++;
          } else {
            currentField += (currentField ? "\n\n" : "") + cardText;
          }
        }

        if (currentField) {
          allEmbed.addFields({
            name: fieldCount === 0 ? "Cards" : `Cards (continued ${fieldCount})`,
            value: currentField,
            inline: false,
          });
        }

        await buttonInteraction.editReply({
          embeds: [allEmbed],
          components: [],
        });
        return;
      }

      // Get new page data
      const { lives: newLives, totalPages: newTotalPages, currentPage: newCurrentPage } = getLivesPage(newPage, 10);

      const newEmbed = new EmbedBuilder()
        .setTitle(`📋 Approved Cards (Page ${newCurrentPage}/${newTotalPages})`)
        .setDescription(`Showing ${newLives.length} card(s)`)
        .setColor(0x00ff00)
        .setFooter({ text: `Total: ${getAllLives().length} cards` })
        .setTimestamp();

      const newCardTexts = newLives.map((card, index) => {
        const globalIndex = (newCurrentPage - 1) * 10 + index + 1;
        return `**${globalIndex}.** ${formatCardDisplay(card)}`;
      });

      let currentField = "";
      let fieldCount = 0;

      for (const cardText of newCardTexts) {
        if (currentField.length + cardText.length + 2 > maxFieldLength) {
          newEmbed.addFields({
            name: fieldCount === 0 ? "Cards" : `Cards (continued ${fieldCount})`,
            value: currentField || "No cards",
            inline: false,
          });
          currentField = cardText;
          fieldCount++;
        } else {
          currentField += (currentField ? "\n\n" : "") + cardText;
        }
      }

      if (currentField) {
        newEmbed.addFields({
          name: fieldCount === 0 ? "Cards" : `Cards (continued ${fieldCount})`,
          value: currentField,
          inline: false,
        });
      }

      const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("prev_page")
          .setLabel("◀ Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(newCurrentPage === 1),
        new ButtonBuilder()
          .setCustomId("next_page")
          .setLabel("Next ▶")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(newCurrentPage === newTotalPages),
        new ButtonBuilder()
          .setCustomId("first_page")
          .setLabel("⏮ First")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newCurrentPage === 1),
        new ButtonBuilder()
          .setCustomId("last_page")
          .setLabel("Last ⏭")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newCurrentPage === newTotalPages),
        new ButtonBuilder()
          .setCustomId("show_all")
          .setLabel("Show All")
          .setStyle(ButtonStyle.Success)
      );

      await buttonInteraction.editReply({
        embeds: [newEmbed],
        components: [newRow],
      });
    });

    collector.on("end", async () => {
      try {
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("prev_page")
            .setLabel("◀ Previous")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("next_page")
            .setLabel("Next ▶")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("first_page")
            .setLabel("⏮ First")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("last_page")
            .setLabel("Last ⏭")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId("show_all")
            .setLabel("Show All")
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
        );

        await response.edit({
          components: [disabledRow],
        });
      } catch (error) {
        // Ignore errors when editing expired messages
      }
    });
  }
}

