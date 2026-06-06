import { topicIconFor } from "@/lib/vocabulary/mock-ui";

/** Chủ đề phổ biến — match theo tên topic từ API. */
export const POPULAR_TOPIC_NEEDLES = [
  { label: "Gia đình", needles: ["gia đình", "family"], icon: "👨‍👩‍👧" },
  { label: "Động vật", needles: ["động vật", "animal"], icon: "🐾" },
  { label: "Trái cây", needles: ["trái cây", "hoa quả", "fruit"], icon: "🍎" },
  { label: "Thức ăn", needles: ["thức ăn", "đồ ăn", "food", "ăn uống"], icon: "🍽️" },
  { label: "Trường học", needles: ["trường", "school", "học"], icon: "🏫" },
  { label: "Công việc", needles: ["công việc", "nghề", "work", "job"], icon: "💼" },
];

/** Nhóm theo mục tiêu học. */
export const GOAL_TOPIC_GROUPS = [
  {
    id: "daily",
    label: "Giao tiếp hàng ngày",
    icon: "💬",
    needles: ["chào", "greeting", "gia đình", "family", "mua", "shop"],
  },
  {
    id: "travel",
    label: "Du lịch & đi lại",
    icon: "✈️",
    needles: ["du lịch", "travel", "đường", "direction", "khách sạn", "hotel"],
  },
  {
    id: "work",
    label: "Công việc & học tập",
    icon: "📚",
    needles: ["công việc", "work", "trường", "school", "office"],
  },
  {
    id: "kids",
    label: "Cho trẻ em",
    icon: "🎈",
    needles: ["động vật", "animal", "màu", "color", "số", "number", "trái cây"],
  },
];

function normalizeTopicKey(topic) {
  return String(topic || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function topicMatchesNeedles(topic, needles) {
  const nt = normalizeTopicKey(topic);
  return needles.some((n) => nt.includes(normalizeTopicKey(n)));
}

export function groupTopicsForPicker(topics = []) {
  const all = topics
    .map((row) => ({
      topic: String(row.topic || "").trim(),
      total: Number(row.total || 0),
      icon: topicIconFor(row.topic),
    }))
    .filter((t) => t.topic);

  const popular = [];
  for (const def of POPULAR_TOPIC_NEEDLES) {
    const hit = all.find((t) => topicMatchesNeedles(t.topic, def.needles));
    if (hit) popular.push({ ...hit, label: def.label, icon: def.icon });
  }

  const goals = GOAL_TOPIC_GROUPS.map((group) => ({
    ...group,
    topics: all.filter((t) => topicMatchesNeedles(t.topic, group.needles)),
  })).filter((g) => g.topics.length > 0);

  return { popular, goals, all };
}
