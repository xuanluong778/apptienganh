/**
 * Tạo file Excel tổng hợp stack & cấu trúc dự án.
 * Chạy: npm run export:excel  hoặc  node scripts/export-project-excel.mjs
 */
import * as fs from "node:fs";
import * as path from "node:path";
import XLSX from "xlsx";

const wb = XLSX.utils.book_new();

const stack = [
  ["Thành phần", "Chi tiết"],
  ["Framework", "Next.js 14 (App Router)"],
  ["UI", "React 18"],
  ["Ngôn ngữ", "JavaScript (.js/.jsx) + TypeScript (.ts/.tsx)"],
  ["API", "Route Handlers app/api/**/route.{js,ts}"],
  ["Database", "MySQL (mysql2/promise)"],
  ["Cache", "Redis (ioredis) + bộ nhớ (runtime-settings, AI cache)"],
  ["AI", "OpenAI + prompt/routing lib/ai; fallback dịch MyMemory"],
  ["Speech", "Azure Speech SDK + Web Speech API"],
  ["Thanh toán", "Stripe"],
  ["Email/SMS", "SendGrid, Nodemailer, Twilio"],
  ["Tên package", "kids-english-nextjs"],
];

const pages = [
  ["Đường dẫn URL", "File", "Mô tả"],
  ["/", "app/page.js", "Trang chủ"],
  ["/auth", "app/auth/page.js", "Đăng nhập / OTP"],
  ["/dashboard", "app/dashboard/page.js", "Tiến độ / dashboard"],
  ["/lessons", "app/lessons/page.js", "Bài học + chat AI"],
  ["/quiz", "app/quiz/page.js (+ quiz.css, error.js)", "Quiz"],
  ["/matching", "app/matching/page.js", "Nối từ / ghép hình"],
  ["/memory", "app/memory/page.js", "Game trí nhớ"],
  ["/vocabulary", "app/vocabulary/page.js", "Từ vựng"],
  ["/dictionary", "app/dictionary/page.js (+ layout.js)", "Từ điển"],
  ["/billing/success", "app/billing/success/page.jsx", "Sau thanh toán Stripe"],
  ["/admin", "app/admin/page.js", "Quản trị"],
  ["/admin/options", "app/admin/options/page.js", "Cấu hình app"],
  ["/admin/students", "app/admin/students/page.jsx", "Học viên"],
  ["/admin/payments", "app/admin/payments/page.jsx", "Thanh toán (admin)"],
];

const apis = [
  ["Phương thức / Endpoint", "File"],
  ["— Auth —", ""],
  ["POST", "app/api/auth/login/route.js"],
  ["POST", "app/api/auth/logout/route.js"],
  ["POST", "app/api/auth/register/route.js"],
  ["POST", "app/api/auth/request-otp/route.js"],
  ["POST", "app/api/auth/otp/send/route.ts"],
  ["POST", "app/api/auth/otp/verify/route.ts"],
  ["GET", "app/api/auth/me/route.js"],
  ["GET/PATCH", "app/api/auth/profile/route.ts"],
  ["POST", "app/api/auth/profile/avatar/route.ts"],
  ["— Nội dung học —", ""],
  ["GET (+POST)", "app/api/vocabulary/route.js"],
  ["GET", "app/api/vocabulary/topics/route.js"],
  ["GET", "app/api/quiz/round/route.js"],
  ["GET", "app/api/matching/round/route.js"],
  ["GET", "app/api/questions/route.js"],
  ["GET (+POST)", "app/api/lessons/route.js"],
  ["POST", "app/api/lessons/chat/route.js"],
  ["GET", "app/api/dictionary/lookup/route.js"],
  ["POST", "app/api/translate/route.js"],
  ["GET", "app/api/pronunciation/token/route.js"],
  ["— Tiến độ —", ""],
  ["GET/POST", "app/api/progress/route.js"],
  ["GET", "app/api/progress/students/route.js"],
  ["— Admin —", ""],
  ["GET/POST", "app/api/admin/students/route.js"],
  ["GET", "app/api/admin/students/progress/route.js"],
  ["GET", "app/api/admin/payments/route.ts"],
  ["POST", "app/api/admin/payments/confirm/route.ts"],
  ["POST", "app/api/admin/import-vocabulary/route.js"],
  ["GET/PATCH", "app/api/admin/app-settings/route.ts"],
  ["— Thanh toán —", ""],
  ["POST", "app/api/payments/create/route.ts"],
  ["POST", "app/api/payments/confirm/route.ts"],
  ["POST", "app/api/billing/checkout/route.ts"],
  ["POST", "app/api/billing/webhook/route.ts"],
  ["POST", "app/api/billing/verify-session/route.ts"],
  ["POST", "app/api/billing/track/route.ts"],
  ["— Hệ thống —", ""],
  ["GET", "app/api/health/route.ts"],
  ["GET", "app/api/health/db/route.ts"],
];

const components = [
  ["File", "Ghi chú"],
  ["components/KidMainNav.jsx", "Menu chính"],
  ["components/DictionarySearchBar.jsx", "Ô tra từ trên header"],
  ["components/AppProviders.jsx", "Providers app"],
  ["components/GuestGateProvider.jsx", "Gate khách"],
  ["components/HeaderProfile.jsx", "Avatar / menu tài khoản"],
  ["components/TrialCountdown.jsx", "Đếm trial"],
  ["components/account/AccountModal.jsx", "Modal tài khoản"],
  ["components/account/BottomAccountDock.jsx", "Dock đăng nhập"],
  ["components/billing/UpgradeMenu.jsx", "Nâng cấp"],
  ["components/billing/PaywallProvider.jsx", "Paywall context"],
  ["components/billing/PaywallModal.jsx", "Modal paywall"],
  ["components/billing/ServicePackagesModal.jsx", "Gói dịch vụ"],
  ["components/billing/BankTransferModal.jsx", "CK ngân hàng"],
];

const libCore = [
  ["File / thư mục", "Vai trò"],
  ["lib/db.js", "MySQL pool"],
  ["lib/auth.js", "Session / cookie"],
  ["lib/auth/create-session.ts", "Tạo session"],
  ["middleware.ts", "Bảo vệ route + API"],
  ["lib/http/api-guards.js", "Guard API"],
  ["lib/http/ai-entitlement.ts", "Hạn mức AI / gói"],
  ["lib/subscriptions/", "Subscription service"],
  ["lib/billing/", "Stripe, checkout, webhook xử lý"],
  ["lib/otp/", "OTP service + bảng"],
  ["lib/runtime-settings/", "Cấu hình Redis/cache"],
  ["lib/vocabulary/ensure-schema.js", "Schema từ vựng"],
  ["lib/ai/", "Router, prompts, services, cache"],
];

const scripts = [
  ["Script", "Mục đích gợi ý"],
  ["scripts/test-db-connection.mjs", "Kiểm tra DB"],
  ["scripts/check-vocab-count.mjs", "Đếm từ vựng"],
  ["scripts/health-check.mjs", "Health"],
  ["scripts/dev-watchdog.mjs", "Watchdog dev"],
  ["scripts/seed-1000-vocabulary.mjs", "Seed từ vựng"],
  ["scripts/export-project-excel.mjs", "Xuất Excel này"],
  ["… (còn ~28 script)", "normalize/backfill/import vocabulary, IPA, câu ví dụ VI"],
];

const sqlFiles = [
  ["File", "Vị trí"],
  ["database.sql", "gốc dự án"],
  ["database.nextjs.sql", "gốc dự án"],
  ["database.vocabulary.sql", "gốc dự án"],
  ["database.auth.sql", "gốc dự án"],
  ["lib/data/subscriptions.sql", "lib/data"],
  ["lib/data/otp_codes.sql", "lib/data"],
  ["lib/data/payments.sql", "lib/data"],
  ["lib/data/billing_conversion.sql", "lib/data"],
  ["lib/data/chat_prompt_variant_usage.sql", "lib/data"],
  ["lib/data/chat_prompt_ab.sql", "lib/data"],
];

function addSheet(name, rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const maxCols = Math.max(...rows.map((r) => r.length), 1);
  const colWidths = [];
  for (let i = 0; i < maxCols; i++) {
    const maxLen = Math.max(
      ...rows.map((r) => String(r[i] ?? "").length),
      10
    );
    colWidths.push({ wch: Math.min(maxLen + 2, 90) });
  }
  ws["!cols"] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
}

addSheet("Stack", stack);
addSheet("Trang_APP", pages);
addSheet("API_Routes", apis);
addSheet("Components", components);
addSheet("Lib_Chinh", libCore);
addSheet("Scripts", scripts);
addSheet("SQL_Schema", sqlFiles);

const outDir = path.join(process.cwd(), "docs");
const outFile = path.join(outDir, "Apptienganh-Tong-Hop.xlsx");
fs.mkdirSync(outDir, { recursive: true });
XLSX.writeFile(wb, outFile);
console.log("Đã tạo:", outFile);
