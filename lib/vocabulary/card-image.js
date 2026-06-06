import { buildVocabularyImageMetadata } from "@/lib/vocabulary/image-prompt";
import { buildStableVocabImageUrl, isUnreliableImageUrl } from "@/lib/vocabulary/stable-image-url";

/** Curated static fallbacks — deterministic Unsplash, no loremflickr. */
const CURATED_IMAGES = {
  man: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=640&h=480&fit=crop",
  woman: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=640&h=480&fit=crop",
  boy: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=640&h=480&fit=crop",
  girl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=640&h=480&fit=crop",
  son: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=640&h=480&fit=crop",
  daughter: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=640&h=480&fit=crop",
  brother: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=640&h=480&fit=crop",
  sister: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=640&h=480&fit=crop",
  mother: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=640&h=480&fit=crop",
  father: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=640&h=480&fit=crop",
  husband: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=640&h=480&fit=crop",
  wife: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=640&h=480&fit=crop",
  parents: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=640&h=480&fit=crop",
  apple: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=640&h=480&fit=crop",
  banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=640&h=480&fit=crop",
  cat: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=640&h=480&fit=crop",
  dog: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=640&h=480&fit=crop",
  pig: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7440?w=640&h=480&fit=crop",
  bird: "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=640&h=480&fit=crop",
  fish: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=640&h=480&fit=crop",
  farmer: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=640&h=480&fit=crop",
  school: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=640&h=480&fit=crop",
  book: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=640&h=480&fit=crop",
  water: "https://images.unsplash.com/photo-1548839140-29a7492991f8?w=640&h=480&fit=crop",
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&h=480&fit=crop",
  family: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=640&h=480&fit=crop",
  animal: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=640&h=480&fit=crop",
  fruit: "https://images.unsplash.com/photo-1619566636852-156f49ad45a5?w=640&h=480&fit=crop",
  education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=640&h=480&fit=crop",
};

function meaningKeyword(meaning) {
  const m = String(meaning || "").toLowerCase();
  if (m.includes("đàn ông") || m.includes("nam") || m.includes("bố") || m.includes("cha")) return "man";
  if (m.includes("phụ nữ") || m.includes("nữ") || m.includes("mẹ")) return "woman";
  if (m.includes("bé trai") || m.includes("con trai")) return "boy";
  if (m.includes("bé gái") || m.includes("con gái")) return "girl";
  if (m.includes("con trai") || m.includes("anh trai") || m.includes("em trai")) return "brother";
  if (m.includes("con gái") || m.includes("chị gái") || m.includes("em gái")) return "sister";
  if (m.includes("vợ")) return "wife";
  if (m.includes("chồng")) return "husband";
  if (m.includes("bố mẹ") || m.includes("cha mẹ")) return "parents";
  if (m.includes("gia đình")) return "family";
  if (m.includes("táo")) return "apple";
  if (m.includes("chuối")) return "banana";
  if (m.includes("mèo")) return "cat";
  if (m.includes("chó")) return "dog";
  if (m.includes("heo") || m.includes("lợn")) return "pig";
  if (m.includes("chim")) return "bird";
  if (m.includes("cá")) return "fish";
  if (m.includes("nông dân")) return "farmer";
  if (m.includes("sách")) return "book";
  if (m.includes("nước")) return "water";
  return "";
}

function topicBucket(topic) {
  const t = String(topic || "").toLowerCase();
  if (t.includes("động vật") || t.includes("animal")) return "animal";
  if (t.includes("trái cây") || t.includes("fruit") || t.includes("hoa quả")) return "fruit";
  if (t.includes("thức ăn") || t.includes("food") || t.includes("ăn")) return "food";
  if (t.includes("trường") || t.includes("school")) return "school";
  if (t.includes("gia đình") || t.includes("family") || t.includes("người")) return "family";
  return "education";
}

/**
 * Resolve card image URL — reliable DB URL first, skip broken hosts, then semantic fallbacks.
 * @returns {{ src: string, approved: boolean }}
 */
export function resolveCardImage(item) {
  const status = String(item?.image_status || "").toLowerCase();
  const url = String(item?.image_url || "").trim();

  if (url && status !== "rejected" && !isUnreliableImageUrl(url)) {
    return { src: url, approved: status === "approved" };
  }

  const word = String(item?.word || "").toLowerCase().trim();
  if (CURATED_IMAGES[word]) {
    return { src: CURATED_IMAGES[word], approved: false };
  }

  const fromMeaning = meaningKeyword(item?.vietnamese_meaning);
  if (fromMeaning && CURATED_IMAGES[fromMeaning]) {
    return { src: CURATED_IMAGES[fromMeaning], approved: false };
  }

  const bucket = topicBucket(item?.topic);
  if (CURATED_IMAGES[bucket]) {
    return { src: CURATED_IMAGES[bucket], approved: false };
  }

  const meta = buildVocabularyImageMetadata(item);
  return { src: meta.image_url, approved: false };
}
