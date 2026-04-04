/**
 * Tạo file Excel tổng hợp stack & cấu trúc dự án.
 * Chạy: node scripts/export-project-excel.mjs
 */
import * as fs from "node:fs";
import * as path from "node:path";
import XLSX from "xlsx";

const wb = XLSX.utils.book_new();

const stack = [
  ["Thành phần", "Chi tiết"],
  ["Framework", "Next.js 14 (App Router)"],
  ["UI", "React 18"],
  ["Ngôn ngữ", "JavaScript (.js/.jsx) + TypeScript (.ts) trong lib/ai"],
  ["API", "Route Handlers app/api/*/route.js"],
  ["Database", "MySQL (mysql2/promise)"],
  ["Cache AI", "Redis (ioredis) + fallback bộ nhớ"],
  ["AI", "OpenAI Chat Completions + prompt/routing lib/ai"],
  ["Speech", "Azure Speech SDK + Web Speech API (trình duyệt)"],
  ["Email/SMS", "SendGrid, Nodemailer, Twilio"],
  ["Tên package", "kids-english-nextjs"],
];

const pages = [
  ["Đường dẫn URL", "File", "Mô tả gợi ý"],
  ["/", "app/page.js", "Trang chủ"],
  ["/vocabulary", "app/vocabulary/page.js", "Từ vựng + phát âm"],
  ["/dictionary", "app/dictionary/page.js", "Tra từ điển"],
  ["/matching", "app/matching/page.js", "Ghép từ và hình"],
  ["/lessons", "app/lessons/page.js", "Bài học + chat AI"],
  ["/quiz", "app/quiz/page.js", "Quiz"],
  ["/memory", "app/memory/page.js", "Game trí nhớ"],
  ["/auth", "app/auth/page.js", "Đăng nhập / OTP"],
  ["/dashboard", "app/dashboard/page.js", "Dashboard"],
  ["/admin", "app/admin/page.js", "Quản trị"],
];

const apis = [
  ["Endpoint", "File"],
  ["POST /api/auth/login", "app/api/auth/login/route.js"],
  ["POST /api/auth/logout", "app/api/auth/logout/route.js"],
  ["POST /api/auth/register", "app/api/auth/register/route.js"],
  ["POST /api/auth/request-otp", "app/api/auth/request-otp/route.js"],
  ["GET /api/auth/me", "app/api/auth/me/route.js"],
  ["GET/POST /api/vocabulary", "app/api/vocabulary/route.js"],
  ["GET /api/vocabulary/topics", "app/api/vocabulary/topics/route.js"],
  ["GET /api/lessons", "app/api/lessons/route.js"],
  ["POST /api/lessons/chat", "app/api/lessons/chat/route.js"],
  ["POST /api/translate", "app/api/translate/route.js"],
  ["GET /api/dictionary/lookup", "app/api/dictionary/lookup/route.js"],
  ["GET /api/pronunciation/token", "app/api/pronunciation/token/route.js"],
  ["GET /api/matching/round", "app/api/matching/round/route.js"],
  ["GET /api/quiz/round", "app/api/quiz/round/route.js"],
  ["GET /api/questions", "app/api/questions/route.js"],
  ["GET/POST /api/progress", "app/api/progress/route.js"],
  ["GET /api/progress/students", "app/api/progress/students/route.js"],
  ["GET/POST /api/admin/students", "app/api/admin/students/route.js"],
  ["GET /api/admin/students/progress", "app/api/admin/students/progress/route.js"],
  ["POST /api/admin/import-vocabulary", "app/api/admin/import-vocabulary/route.js"],
];

const libAi = [
  ["Đường dẫn", "Vai trò"],
  ["lib/ai/client.ts", "completeAi, cache, gọi OpenAI"],
  ["lib/ai/router.ts", "Chọn model / maxTokens / temperature theo route type"],
  ["lib/ai/prompts/", "chat, translate, grammar, speaking (TS)"],
  ["lib/ai/experiments/chat-prompt-ab.ts", "A/B test prompt chat + metrics MySQL"],
  ["lib/ai/cache/response-cache.ts", "Redis + memory fallback"],
  ["lib/ai/services/lessons-chat.service.js", "Chat bài học (JSON tutor)"],
  ["lib/ai/services/translate.service.js", "Dịch EN→VI"],
  ["lib/db.js", "Kết nối MySQL pool"],
  ["lib/auth.js", "Xác thực session / OTP"],
  ["components/DictionarySearchBar.jsx", "Ô tìm từ trên menu"],
];

function addSheet(name, rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const colWidths = rows[0].map((_, i) => {
    const maxLen = Math.max(...rows.map((r) => String(r[i] ?? "").length), 10);
    return { wch: Math.min(maxLen + 2, 80) };
  });
  ws["!cols"] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, name);
}

addSheet("Stack", stack);
addSheet("Trang_APP", pages);
addSheet("API_Routes", apis);
addSheet("Lib_AI_Chinh", libAi);

const outDir = path.join(process.cwd(), "docs");
const outFile = path.join(outDir, "Apptienganh-Tong-Hop.xlsx");
fs.mkdirSync(outDir, { recursive: true });
XLSX.writeFile(wb, outFile);
console.log("Đã tạo:", outFile);
