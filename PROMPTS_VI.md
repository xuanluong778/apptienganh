# Bộ Prompt Chuẩn (tiếng Việt)

## 1) Tạo DB (phpMyAdmin)
```
Tạo database MySQL tên english_app, charset utf8mb4.
Tạo đầy đủ các bảng cho app học tiếng Anh trẻ em:
users, user_sessions, lessons, questions, progress, vocabulary.
Thêm khóa ngoại, index và unique key phù hợp.
Xuất ra file SQL hoàn chỉnh.
```

## 2) Tạo DB connection (Next.js + mysql2)
```
Tạo file kết nối MySQL cho Next.js App Router bằng mysql2/promise.
Dùng connection pool, hỗ trợ DATABASE_URL hoặc DB_HOST/DB_USER/DB_NAME.
Export pool để tái sử dụng trong API routes.
```

## 3) Tạo API
```
Tạo API routes Next.js cho:
- auth: register/login/logout/me
- lessons: GET/POST
- questions: GET theo lesson_id
- progress: GET/POST
- vocabulary: GET có phân trang, POST thêm từ mới
Trả JSON chuẩn success/message/data.
```

## 4) Prompt gọi API
```
Tạo frontend gọi API bằng fetch:
- Hiển thị loading, error, success
- Xử lý response JSON chuẩn
- Có ví dụ gọi GET /api/vocabulary?page=1&limit=24 và POST /api/progress
```

## 5) Prompt tạo UI
```
Tạo UI thân thiện cho trẻ em:
- nút to, màu sáng, bo tròn
- font dễ đọc
- điều hướng đơn giản
- responsive mobile
```

## 6) Prompt tạo game
```
Tạo 3 game cho trẻ em:
- Quiz 4 lựa chọn
- Matching kéo-thả từ với hình
- Memory flip card ghép cặp
Có hiệu ứng thắng, điểm số và nút chơi lại.
```

## 7) Prompt login
```
Tạo login/register cơ bản bằng Next.js API + MySQL.
Không dùng JWT, dùng session token lưu DB + cookie httpOnly.
Thêm route /api/auth/me để kiểm tra trạng thái đăng nhập.
```

## 8) Prompt deploy Vercel
```
Chuẩn bị app Next.js deploy Vercel:
- kiểm tra package.json, app/layout.js, app/page.js
- thêm .env.example
- hướng dẫn set env DATABASE_URL hoặc DB_* trên Vercel
- kiểm tra build production pass
```
