import crypto from "node:crypto";
import fs from "node:fs";

const envPath = process.argv[2] || ".env";
const original = fs.readFileSync(envPath, "utf8");
const env = {};
for (const line of original.split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[match[1]] = value.replace(/\\n/g, "\n");
}

if (env.WXPAY_PUBLIC_KEY) {
  console.log("WXPAY_PUBLIC_KEY already configured");
  process.exit(0);
}

for (const name of ["WXPAY_MCH_ID", "WXPAY_SERIAL_NO", "WXPAY_PRIVATE_KEY", "WXPAY_API_V3_KEY"]) {
  if (!env[name]) throw new Error(`${name} is not configured`);
}
if (Buffer.byteLength(env.WXPAY_API_V3_KEY, "utf8") !== 32) {
  throw new Error("WXPAY_API_V3_KEY must be 32 bytes");
}

const path = "/v3/certificates";
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = crypto.randomBytes(16).toString("hex");
const message = `GET\n${path}\n${timestamp}\n${nonce}\n\n`;
const signature = crypto.createSign("RSA-SHA256").update(message).sign(env.WXPAY_PRIVATE_KEY, "base64");
const authorization =
  `WECHATPAY2-SHA256-RSA2048 mchid="${env.WXPAY_MCH_ID}",nonce_str="${nonce}",` +
  `timestamp="${timestamp}",serial_no="${env.WXPAY_SERIAL_NO}",signature="${signature}"`;

const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
  headers: { Accept: "application/json", Authorization: authorization, "User-Agent": "AceBook-deploy/1.5.94" },
});
const payload = await response.json();
if (!response.ok || !Array.isArray(payload.data) || payload.data.length === 0) {
  throw new Error(`Unable to download WeChat Pay platform certificate: HTTP ${response.status} ${JSON.stringify(payload)}`);
}

const current = payload.data
  .filter((item) => new Date(item.expire_time).getTime() > Date.now())
  .sort((a, b) => new Date(b.effective_time).getTime() - new Date(a.effective_time).getTime())[0];
if (!current?.encrypt_certificate) throw new Error("No valid WeChat Pay platform certificate returned");

const encrypted = current.encrypt_certificate;
const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
const authTag = ciphertext.subarray(ciphertext.length - 16);
const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(env.WXPAY_API_V3_KEY), Buffer.from(encrypted.nonce));
decipher.setAuthTag(authTag);
decipher.setAAD(Buffer.from(encrypted.associated_data || ""));
const certificate = decipher.update(ciphertext.subarray(0, -16), undefined, "utf8") + decipher.final("utf8");
if (!certificate.includes("BEGIN CERTIFICATE")) throw new Error("Downloaded certificate is not valid PEM");

const escaped = certificate.trim().replace(/\r?\n/g, "\\n");
let updated = original.replace(/^WXPAY_PUBLIC_KEY=.*$/m, "");
updated = updated.replace(/^WXPAY_PUBLIC_KEY_ID=.*$/m, "");
updated = `${updated.trimEnd()}\nWXPAY_PUBLIC_KEY_ID=${current.serial_no}\nWXPAY_PUBLIC_KEY=${escaped}\n`;
fs.writeFileSync(envPath, updated, { mode: 0o600 });
console.log(`WXPAY_PUBLIC_KEY configured from platform certificate serial ${current.serial_no}`);
