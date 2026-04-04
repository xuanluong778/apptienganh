# Checklist triển khai

## Đã hoàn thành
- [x] Tạo DB schema cho Next.js (`database.nextjs.sql`)
- [x] Kết nối MySQL bằng `mysql2` + pool (`lib/db.js`)
- [x] API auth (register/login/logout/me)
- [x] API lessons/questions/progress
- [x] API vocabulary có phân trang (`/api/vocabulary`)
- [x] UI chính và các game (quiz/matching/memory)
- [x] Login/Register UI (`/auth`)
- [x] Dashboard (`/dashboard`)
- [x] Chuẩn bị deploy Vercel (`.env.example`, `VERCEL_DEPLOYMENT.md`)

## Mục mở rộng theo yêu cầu 1000 từ
- [x] Tạo bảng `vocabulary` (`database.vocabulary.sql`)
- [x] Tạo script seed 1000 từ: `scripts/seed-1000-vocabulary.mjs`
- [x] Tạo trang hiển thị từ vựng: `/vocabulary`

## Lệnh chạy để nạp 1000 từ
1. Import SQL:
   - `database.nextjs.sql`
   - `database.vocabulary.sql`
2. Cấu hình `.env.local` (hoặc env trên server)
3. Chạy:
   - `npm run seed:vocab`

Script sẽ nạp 1000 từ cơ bản mức beginner, bao gồm:
- từ vựng
- IPA (nếu nguồn từ điển có)
- câu ví dụ (ưu tiên ví dụ từ từ điển, fallback câu mẫu)
- audio phát âm (ưu tiên audio từ từ điển, fallback TTS)
