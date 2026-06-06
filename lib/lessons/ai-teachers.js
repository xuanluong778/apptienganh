export const DEFAULT_AI_TEACHER_ID = "bunny";
export const DEFAULT_SELECTED_TEACHER = "teacher_bunny";

const TEACHER_ID_MAP = {
  bunny: "teacher_bunny",
  teacher_bunny: "teacher_bunny",
  learna: "teacher_bunny",
  fox: "teacher_fox",
  teacher_fox: "teacher_fox",
  captain_fox: "teacher_fox",
  mateo: "teacher_fox",
  cat: "teacher_cat",
  teacher_cat: "teacher_cat",
  miss_cat: "teacher_cat",
  hazel: "teacher_cat",
  owl: "teacher_owl",
  teacher_owl: "teacher_owl",
  professor_owl: "teacher_owl",
  panda: "teacher_panda",
  teacher_panda: "teacher_panda",
  panda_buddy: "teacher_panda",
  skye: "teacher_panda",
  bee: "teacher_bee",
  teacher_bee: "teacher_bee",
  jasmine: "teacher_bee",
};

/** UI id (bunny) or API id (teacher_bunny) → canonical teacher_* for chat API. */
export function normalizeSelectedTeacher(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  return TEACHER_ID_MAP[key] || DEFAULT_SELECTED_TEACHER;
}

export const AI_TEACHERS = [
  {
    id: "bunny",
    name: "Teacher Bunny",
    voiceName: "Learna",
    emoji: "🐰",
    description: "Warm and gentle — great for first words.",
    tag: "Friendly",
    origin: "Mỹ",
    traits: ["Kiên nhẫn", "Bài bản", "Luôn động viên"],
    specialties: [
      { label: "Tổng quát", icon: "📚" },
      { label: "Tiếng Anh Mỹ", icon: "🇺🇸" },
    ],
    bio: "Learna luôn kiên nhẫn và khuyến khích bạn từng bước nhỏ. Phong cách dạy bài bản, phù hợp người mới bắt đầu hoặc cần sự an tâm.",
    portraitUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=480&h=360&fit=crop&crop=faces",
    online: true,
  },
  {
    id: "fox",
    name: "Captain Fox",
    voiceName: "Mateo",
    emoji: "🦊",
    description: "Adventure stories and brave sentences.",
    tag: "Brave",
    origin: "Tây Ban Nha",
    traits: ["Năng động", "Sáng tạo", "Thích thử thách"],
    specialties: [
      { label: "Giao tiếp", icon: "💬" },
      { label: "Du lịch", icon: "✈️" },
    ],
    bio: "Mateo thích kể chuyện nhỏ và đưa bạn vào những tình huống thú vị. Rất phù hợp để luyện nói tự tin và tự nhiên.",
    portraitUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=480&h=360&fit=crop&crop=faces",
    online: true,
  },
  {
    id: "cat",
    name: "Miss Cat",
    voiceName: "Hazel",
    emoji: "🐱",
    description: "Clear pronunciation and neat grammar.",
    tag: "Precise",
    origin: "Anh",
    traits: ["Chuẩn xác", "Tỉ mỉ", "Dễ hiểu"],
    specialties: [
      { label: "Phát âm", icon: "🎤" },
      { label: "Học thuật", icon: "🎓" },
    ],
    bio: "Hazel chú trọng phát âm và ngữ pháp cơ bản. Cô ấy sửa nhẹ nhàng và giúp bạn nói rõ ràng hơn từng câu.",
    portraitUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=480&h=360&fit=crop&crop=faces",
    online: true,
  },
  {
    id: "owl",
    name: "Professor Owl",
    voiceName: "Learna-X",
    emoji: "🦉",
    description: "Smart tips and fun word games.",
    tag: "Wise",
    origin: "AI nâng cao",
    traits: ["Thông minh", "Logic", "Có hệ thống"],
    specialties: [
      { label: "Từ vựng", icon: "📖" },
      { label: "Kinh doanh", icon: "💼" },
    ],
    bio: "Learna-X là phiên bản nâng cao — thích câu hỏi sâu hơn, trò chơi từ vựng và luyện tư duy bằng tiếng Anh.",
    portraitUrl:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=480&h=360&fit=crop&crop=faces",
    online: true,
  },
  {
    id: "panda",
    name: "Panda Buddy",
    voiceName: "Skye",
    emoji: "🐼",
    description: "Calm chat — perfect for shy learners.",
    tag: "Calm",
    origin: "Úc",
    traits: ["Thân thiện", "Thoải mái", "Không áp lực"],
    specialties: [
      { label: "Trò chuyện", icon: "☕" },
      { label: "Xã hội", icon: "🤝" },
    ],
    bio: "Skye nói chuyện như bạn cùng lớp — thoải mái, không áp lực. Rất phù hợp nếu bạn ngại nói tiếng Anh.",
    portraitUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=480&h=360&fit=crop&crop=faces",
    online: true,
  },
  {
    id: "bee",
    name: "Teacher Bee",
    voiceName: "Jasmine",
    emoji: "🐝",
    description: "Beego mascot — bright energy and daily practice.",
    tag: "Cheerful",
    origin: "Việt Nam",
    traits: ["Vui vẻ", "Nhiệt tình", "Gần gũi"],
    specialties: [
      { label: "Beego Kids", icon: "🐝" },
      { label: "Hàng ngày", icon: "📅" },
    ],
    bio: "Jasmine mang năng lượng Beego — vui, gần gũi và luôn khích lệ bạn luyện tập mỗi ngày một chút.",
    portraitUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=480&h=360&fit=crop&crop=faces",
    online: true,
  },
];

export function getTeacherById(id) {
  const key = String(id || DEFAULT_AI_TEACHER_ID).trim();
  return AI_TEACHERS.find((t) => t.id === key) || AI_TEACHERS[0];
}

export function getTeacherVoiceName(teacher) {
  if (!teacher) return "Learna";
  return teacher.voiceName || teacher.name.replace(/^(Teacher|Captain|Miss|Professor)\s+/i, "");
}

export function getTeacherDisplayLabel(teacher) {
  const name = getTeacherVoiceName(teacher);
  return `AI Teacher — ${name}`;
}
