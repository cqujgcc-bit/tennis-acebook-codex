// 临时测试脚本，用完可删除
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const Dysmsapi20170525 = require("@alicloud/dysmsapi20170525").default;
const { SendSmsRequest } = require("@alicloud/dysmsapi20170525");
const { Config: OpenApiConfig } = require("@alicloud/openapi-client");

const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
const tplCode = process.env.SMS_TPL_VERIFY_CODE;

console.log("AccessKey ID:", accessKeyId ? accessKeyId.substring(0,8)+"..." : "NOT SET");
console.log("Template Code:", tplCode);

if (!accessKeyId || !accessKeySecret) {
  console.error("AccessKey not set!");
  process.exit(1);
}

const config = new OpenApiConfig({ accessKeyId, accessKeySecret });
config.endpoint = "dysmsapi.aliyuncs.com";
const client = new Dysmsapi20170525(config);

const testPhone = process.argv[2] || "13800138000";
console.log("Sending to:", testPhone);

const req = new SendSmsRequest({
  phoneNumbers: testPhone,
  signName: "深网私教",
  templateCode: tplCode,
  templateParam: JSON.stringify({ code: "123456" }),
});

try {
  const resp = await client.sendSms(req);
  console.log("Response code:", resp.body?.code);
  console.log("Response message:", resp.body?.message);
  console.log("BizId:", resp.body?.bizId);
  if (resp.body?.code === "OK") {
    console.log("✅ 短信发送成功！");
  } else {
    console.log("❌ 短信发送失败:", resp.body?.code, resp.body?.message);
  }
} catch (err) {
  console.error("Exception:", err.message || err);
}
