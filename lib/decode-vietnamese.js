import iconv from "iconv-lite";

function scoreText(text) {
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  const vietnameseCount = (text.match(/[ăâêôơưđáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệóòỏõọốồổỗộớờởỡợúùủũụứừửữựíìỉĩịýỳỷỹỵ]/gi) || []).length;
  const controlCount = (text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) || []).length;
  return vietnameseCount * 4 - replacementCount * 10 - controlCount * 8;
}

export function decodeVietnameseBuffer(buffer) {
  const candidates = [
    { encoding: "utf8", text: buffer.toString("utf8") },
    { encoding: "utf16le", text: buffer.toString("utf16le") },
    { encoding: "windows1258", text: iconv.decode(buffer, "windows1258") },
    { encoding: "windows1252", text: iconv.decode(buffer, "windows1252") },
  ];

  candidates.sort((a, b) => scoreText(b.text) - scoreText(a.text));
  return candidates[0].text;
}
