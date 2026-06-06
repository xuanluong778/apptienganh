import { kidWordAudioUrl, kidWordImageUrl } from "@/lib/kids-vocabulary/utils";
import { CAU_TRUYEN_STORIES } from "./cau-truyen-stories";
import { CHO_BE_STORIES } from "./cho-be-stories";
import { DOCX_STORIES } from "./docx-stories";
import { LION_RABBIT_STORY } from "./lion-rabbit";

const DOCX_STORIES_FILTERED = DOCX_STORIES.filter((s) => s.id !== LION_RABBIT_STORY.id);

/** Tab danh sách truyện vui */
export const STORY_LIST_TABS = [
  { id: "kids", label: "Truyện cho bé" },
  { id: "hay", label: "Truyện Hay" },
  { id: "cuoi", label: "Truyện cười vui nhộn" },
];

function vocab(storyId, word, phonetic, vi) {
  const id = `${storyId}:${word}`;
  return {
    id,
    word,
    phonetic,
    vietnameseMeaning: vi,
    imageUrl: kidWordImageUrl(word),
    audioUrl: kidWordAudioUrl(word),
  };
}

export const KIDS_FUN_STORIES = [
  {
    id: "banana-hat",
    titleEn: "The Banana Hat",
    titleVi: "Chiếc mũ chuối",
    emoji: "🐵",
    color: "#ffd166",
    paragraphs: [
      { en: "The monkey has a banana.", vi: "Chú khỉ có một quả chuối." },
      { en: "He is very happy.", vi: "Chú rất vui." },
      { en: "He says, “Yummy! I love bananas!”", vi: "Chú nói: “Ngon quá! Con thích chuối!”" },
      { en: "But then, the monkey has a funny idea.", vi: "Nhưng rồi, chú khỉ nảy ra một ý tưởng buồn cười." },
      { en: "He puts the banana on his head.", vi: "Chú đặt quả chuối lên đầu." },
      { en: "“Look! I have a banana hat!” says the monkey.", vi: "“Nhìn này! Con có mũ chuối!” chú khỉ nói." },
      { en: "A bird sees him.", vi: "Một chú chim nhìn thấy chú." },
      { en: "The bird says, “That is not a hat. That is food!”", vi: "Chim nói: “Đó không phải mũ. Đó là đồ ăn!”" },
      { en: "The monkey laughs.", vi: "Chú khỉ cười." },
      { en: "Then the banana falls down.", vi: "Rồi quả chuối rơi xuống." },
      { en: "Oops!", vi: "Úi!" },
      { en: "The banana lands on the dog’s nose.", vi: "Quả chuối rơi lên mũi con chó." },
      { en: "The dog says, “Wow! I have a banana nose!”", vi: "Con chó nói: “Wow! Con có mũi chuối!”" },
      { en: "Everyone laughs.", vi: "Mọi người đều cười." },
      { en: "The monkey says, “Okay, okay. Bananas are for eating, not for hats!”", vi: "Chú khỉ nói: “Được rồi, được rồi. Chuối để ăn, không phải để làm mũ!”" },
      { en: "Then they all share the banana.", vi: "Rồi mọi người cùng chia quả chuối." },
    ],
    vocabulary: [
      vocab("banana-hat", "monkey", "/ˈmʌŋ.ki/", "con khỉ"),
      vocab("banana-hat", "banana", "/bəˈnæn.ə/", "quả chuối"),
      vocab("banana-hat", "happy", "/ˈhæp.i/", "vui, hạnh phúc"),
      vocab("banana-hat", "hat", "/hæt/", "cái mũ"),
      vocab("banana-hat", "bird", "/bɜːd/", "con chim"),
      vocab("banana-hat", "dog", "/dɒɡ/", "con chó"),
      vocab("banana-hat", "nose", "/nəʊz/", "cái mũi"),
      vocab("banana-hat", "yummy", "/ˈjʌm.i/", "ngon"),
      vocab("banana-hat", "food", "/fuːd/", "đồ ăn"),
      vocab("banana-hat", "laugh", "/lɑːf/", "cười"),
      vocab("banana-hat", "share", "/ʃeə/", "chia sẻ"),
    ],
    questions: [
      {
        id: "q1",
        questionVi: "Chú khỉ có gì?",
        questionEn: "What does the monkey have?",
        options: ["A banana", "A car", "A book"],
        correctIndex: 0,
      },
      {
        id: "q2",
        questionVi: "Chú khỉ đặt chuối ở đâu?",
        questionEn: "Where does the monkey put the banana?",
        options: ["On his head", "In the water", "Under the bed"],
        correctIndex: 0,
      },
      {
        id: "q3",
        questionVi: "Chuối rơi lên đâu?",
        questionEn: "Where does the banana land?",
        options: ["On the dog's nose", "On the bird's wing", "On the tree"],
        correctIndex: 0,
      },
      {
        id: "q4",
        questionVi: "Cuối truyện, mọi người làm gì?",
        questionEn: "At the end, what do they do?",
        options: ["Share the banana", "Throw the banana", "Hide the banana"],
        correctIndex: 0,
      },
    ],
    games: {
      listenChoose: [
        "banana",
        "monkey",
        "dog",
        "bird",
        "hat",
        "happy",
        "nose",
        "yummy",
        "food",
        "share",
      ],
      dragDrop: [
        "monkey",
        "banana",
        "bird",
        "dog",
        "hat",
        "happy",
        "nose",
        "laugh",
        "food",
        "share",
      ],
      fillBlank: [
        {
          prompt: "The monkey has a ______.",
          promptVi: "Chú khỉ có một ______.",
          options: ["banana", "hat", "dog"],
          correctIndex: 0,
        },
        {
          prompt: "He is very ______.",
          promptVi: "Chú rất ______.",
          options: ["happy", "banana", "bird"],
          correctIndex: 0,
        },
        {
          prompt: "He puts the banana on his ______.",
          promptVi: "Chú đặt quả chuối lên ______.",
          options: ["head", "hat", "nose"],
          correctIndex: 0,
        },
        {
          prompt: "Look! I have a banana ______!",
          promptVi: "Nhìn này! Con có ______ chuối!",
          options: ["hat", "dog", "food"],
          correctIndex: 0,
        },
        {
          prompt: "A ______ sees him.",
          promptVi: "Một ______ nhìn thấy chú.",
          options: ["bird", "monkey", "banana"],
          correctIndex: 0,
        },
        {
          prompt: "That is ______!",
          promptVi: "Đó là ______!",
          options: ["food", "hat", "happy"],
          correctIndex: 0,
        },
        {
          prompt: "The monkey ______.",
          promptVi: "Chú khỉ ______.",
          options: ["laugh", "share", "yummy"],
          correctIndex: 0,
        },
        {
          prompt: "The banana lands on the dog's ______.",
          promptVi: "Chuối rơi lên ______ con chó.",
          options: ["nose", "hat", "bird"],
          correctIndex: 0,
        },
        {
          prompt: "Wow! I have a banana ______!",
          promptVi: "Wow! Con có ______ chuối!",
          options: ["nose", "monkey", "share"],
          correctIndex: 0,
        },
        {
          prompt: "Then they all ______ the banana.",
          promptVi: "Rồi mọi người cùng ______ chuối.",
          options: ["share", "laugh", "food"],
          correctIndex: 0,
        },
      ],
    },
  },
  LION_RABBIT_STORY,
  ...CHO_BE_STORIES,
  ...DOCX_STORIES_FILTERED,
  ...CAU_TRUYEN_STORIES,
];

/** Truyện cho bé: 30 truyện từ cau-truyen-cho-be.txt + Sư tử và thỏ. */
export const KIDS_STORIES_FOR_BABIES = [
  { ...LION_RABBIT_STORY, listCategory: "kids" },
  ...CHO_BE_STORIES,
];

/** Truyện kể chuyện hay (bộ import). */
export const KIDS_STORIES_HAY = DOCX_STORIES_FILTERED.map((s) => ({ ...s, listCategory: "hay" }));

/** Truyện cười vui nhộn (cau-truyen.txt). */
export const KIDS_STORIES_CUOI = CAU_TRUYEN_STORIES;

export function getStoriesByListCategory(category) {
  if (category === "kids") return KIDS_STORIES_FOR_BABIES;
  if (category === "hay") return KIDS_STORIES_HAY;
  if (category === "cuoi") return KIDS_STORIES_CUOI;
  return KIDS_FUN_STORIES;
}

export function getStoryById(storyId) {
  return KIDS_FUN_STORIES.find((s) => s.id === storyId) || null;
}

/** Gộp các câu thành một đoạn văn (hiển thị truyện liền mạch). */
export function storyAsParagraph(story, lang = "en") {
  if (!story?.paragraphs?.length) return "";
  if (lang === "vi") return story.paragraphs.map((p) => p.vi).join(" ");
  return story.paragraphs.map((p) => p.en).join(" ");
}

export function storyGameWords(story) {
  const map = new Map(story.vocabulary.map((w) => [w.word.toLowerCase(), w]));
  return (keys) =>
    keys.map((k) => map.get(String(k).toLowerCase())).filter(Boolean);
}
