/** UI-only helpers for /vocabulary mockup (no API/DB changes). */

export const MOCK_VOCAB_STATS = {
  learnedToday: 24,
  reviewing: 18,
  streakDays: 7,
};

/** Curated topic chips — short labels matching approved mockup. */
export const TOPIC_CHIP_DEFS = [
  { label: "Tất cả", topic: "", icon: "📚" },
  { label: "Trái cây", needles: ["trai cay", "hoa qua", "fruit"] },
  { label: "Thức ăn", needles: ["thuc an", "do an", "food", "an uong"] },
  { label: "Trường học", needles: ["truong", "school", "hoc tap"] },
  { label: "Gia đình", needles: ["gia dinh", "family"] },
  { label: "Động vật", needles: ["dong vat", "animal"] },
];

export function resolveTopicChips(topics = []) {
  const chips = [TOPIC_CHIP_DEFS[0]];
  for (let i = 1; i < TOPIC_CHIP_DEFS.length; i += 1) {
    const def = TOPIC_CHIP_DEFS[i];
    const hit = topics.find((t) => {
      const nt = String(t.topic || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return def.needles.some((n) => nt.includes(n));
    });
    if (hit) chips.push({ label: def.label, topic: hit.topic, icon: def.icon || "🏷️" });
  }
  return chips;
}

function normalizeTopicKey(topic) {
  return String(topic || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Icon for a topic row from API. */
export function topicIconFor(topic) {
  const nt = normalizeTopicKey(topic);
  if (nt.includes("trai cay") || nt.includes("hoa qua") || nt.includes("fruit")) return "🍎";
  if (nt.includes("thuc an") || nt.includes("do an") || nt.includes("food") || nt.includes("an uong"))
    return "🍽️";
  if (nt.includes("truong") || nt.includes("school")) return "🏫";
  if (nt.includes("gia dinh") || nt.includes("family")) return "👨‍👩‍👧";
  if (nt.includes("dong vat") || nt.includes("animal")) return "🐾";
  if (nt.includes("am nhac") || nt.includes("music")) return "🎵";
  if (nt.includes("the thao") || nt.includes("sport")) return "⚽";
  if (nt.includes("thoi tiet") || nt.includes("weather")) return "🌤️";
  if (nt.includes("mau sac") || nt.includes("color")) return "🎨";
  if (nt.includes("cong viec") || nt.includes("job")) return "💼";
  return "🏷️";
}

/** All topic chips from API — Tất cả + every topic. */
export function buildAllTopicChips(topics = []) {
  const chips = [{ label: "Tất cả", topic: "", icon: "📚", title: "Tất cả chủ đề" }];
  for (const row of topics) {
    const topic = String(row.topic || "").trim();
    if (!topic) continue;
    chips.push({
      label: topic,
      topic,
      icon: topicIconFor(topic),
      title: topic,
      count: Number(row.total || 0),
    });
  }
  return chips;
}

const WORD_IMAGES = {
  man: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=640&h=480&fit=crop",
  woman: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=640&h=480&fit=crop",
  boy: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=640&h=480&fit=crop",
  girl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=640&h=480&fit=crop",
  child: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=640&h=480&fit=crop",
  baby: "https://images.unsplash.com/photo-1515488042361-ee00e17dec6c?w=640&h=480&fit=crop",
  apple: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=640&h=480&fit=crop",
  banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=640&h=480&fit=crop",
  cat: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=640&h=480&fit=crop",
  dog: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=640&h=480&fit=crop",
  school: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=640&h=480&fit=crop",
  book: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=640&h=480&fit=crop",
  water: "https://images.unsplash.com/photo-1548839140-29a7492991f8?w=640&h=480&fit=crop",
  happy: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=640&h=480&fit=crop",
  run: "https://images.unsplash.com/photo-1476480862126-209bfaa8dcc8?w=640&h=480&fit=crop",
  eat: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&h=480&fit=crop",
};

function meaningKeyword(meaning) {
  const m = String(meaning || "").toLowerCase();
  if (m.includes("đàn ông") || m.includes("nam")) return "man";
  if (m.includes("phụ nữ") || m.includes("nữ")) return "woman";
  if (m.includes("bé trai") || m.includes("con trai")) return "boy";
  if (m.includes("bé gái") || m.includes("con gái")) return "girl";
  if (m.includes("trẻ em") || m.includes("em bé")) return "child";
  if (m.includes("táo")) return "apple";
  if (m.includes("chuối")) return "banana";
  if (m.includes("mèo")) return "cat";
  if (m.includes("chó")) return "dog";
  if (m.includes("sách")) return "book";
  if (m.includes("nước")) return "water";
  if (m.includes("vui")) return "happy";
  if (m.includes("chạy")) return "run";
  if (m.includes("ăn")) return "eat";
  return "";
}

/** Client-side semantic image for card display (UI only). */
export function resolveMockCardImage(item) {
  const word = String(item?.word || "").toLowerCase().trim();
  if (WORD_IMAGES[word]) return WORD_IMAGES[word];

  const fromMeaning = meaningKeyword(item?.vietnamese_meaning);
  if (fromMeaning && WORD_IMAGES[fromMeaning]) return WORD_IMAGES[fromMeaning];

  const topic = String(item?.topic || "").toLowerCase();
  if (topic.includes("động vật") || topic.includes("animal")) {
    return WORD_IMAGES.dog;
  }
  if (topic.includes("trái cây") || topic.includes("fruit")) {
    return WORD_IMAGES.apple;
  }
  if (topic.includes("trường") || topic.includes("school")) {
    return WORD_IMAGES.school;
  }

  const seed = encodeURIComponent(word || "vocab");
  return `https://picsum.photos/seed/${seed}/640/480`;
}

export function posChipMeta(pos) {
  if (pos === "noun") return { short: "N", label: "Danh từ", tone: "noun" };
  if (pos === "verb") return { short: "V", label: "Động từ", tone: "verb" };
  if (pos === "adjective") return { short: "Adj", label: "Tính từ", tone: "adj" };
  if (pos === "adverb") return { short: "Adv", label: "Trạng từ", tone: "adv" };
  return null;
}
