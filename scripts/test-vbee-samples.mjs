import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const token = process.env.VBEE_API_TOKEN || process.env.VBEE_TOKEN || "";
const appId = process.env.VBEE_APP_ID || "";
const voice = process.env.VBEE_VOICE_CODE || "hn_female_ngochuyen_full_48k-fhg";

const samples = [
  "Con nói gần đúng rồi. Khi nói thích mèo nói chung, mình dùng 'cats' số nhiều.",
  "Con nói gần đúng rồi. Khi nói thích mèo nói chung, mình dùng <english>cats</english> số nhiều.",
  "Your question is already a good daily question.",
];

for (const text of samples) {
  const res = await fetch("https://api.vbee.vn/v1/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "App-Id": appId,
      "x-app-id": appId,
    },
    body: JSON.stringify({ text, mode: "sync", voiceCode: voice, outputFormat: "mp3" }),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const preview = buf.slice(0, 80).toString("utf8");
  console.log({
    status: res.status,
    bytes: buf.length,
    json: preview.startsWith("{"),
    text: text.slice(0, 70),
  });
}
