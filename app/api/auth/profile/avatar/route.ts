import { NextResponse, type NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import pool from "@/lib/db";
import { ensureUserProfileColumns } from "@/lib/users/ensure-user-profile-columns";

const COOKIE_NAME = "session_token";
const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
    }

    const [rows] = await pool.query(
      `SELECT u.id FROM user_sessions s INNER JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > NOW() LIMIT 1`,
      [token]
    );
    const user = (rows as { id: number }[])[0];
    if (!user) {
      return NextResponse.json({ success: false, message: "Session expired." }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "file is required." }, { status: 400 });
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { success: false, message: "Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, message: "Ảnh tối đa 2MB." },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = extForMime(file.type);
    const dir = path.join(process.cwd(), "public", "uploads", "avatars");
    await fs.mkdir(dir, { recursive: true });
    const filename = `${user.id}-${Date.now()}.${ext}`;
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, buf);

    const publicUrl = `/uploads/avatars/${filename}`;

    await ensureUserProfileColumns();
    await pool.query(`UPDATE users SET avatar_url = ? WHERE id = ?`, [publicUrl, user.id]);

    return NextResponse.json({
      success: true,
      data: { avatar_url: publicUrl },
    });
  } catch (err) {
    console.error("[auth/profile/avatar] POST", err);
    return NextResponse.json({ success: false, message: "Could not upload avatar." }, { status: 500 });
  }
}
