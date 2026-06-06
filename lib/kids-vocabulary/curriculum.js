import { kidWordAudioUrl, kidWordImageUrl } from "./utils";

/**
 * Bài học cố định: mỗi chủ đề 5–8 từ, đủ field cho UI & game.
 * id từ = `${lessonId}:${word}` để lưu progress.
 */
function w(lessonId, word, phonetic, vietnameseMeaning, exampleSentence) {
  const id = `${lessonId}:${word.toLowerCase().replace(/\s+/g, "-")}`;
  return {
    id,
    lessonId,
    word,
    phonetic,
    vietnameseMeaning,
    imageUrl: kidWordImageUrl(word),
    audioUrl: kidWordAudioUrl(word),
    exampleSentence,
  };
}

export const KIDS_VOCAB_LESSONS = [
  {
    id: "fruits",
    titleEn: "Fruits",
    titleVi: "Trái cây",
    emoji: "🍎",
    color: "#ff8fab",
    words: [
      w("fruits", "apple", "/ˈæp.əl/", "quả táo", "I like apples."),
      w("fruits", "banana", "/bəˈnæn.ə/", "quả chuối", "Monkeys love bananas."),
      w("fruits", "orange", "/ˈɒr.ɪndʒ/", "quả cam", "This orange is sweet."),
      w("fruits", "grape", "/ɡreɪp/", "chùm nho", "Grapes are small and round."),
      w("fruits", "mango", "/ˈmæŋ.ɡəʊ/", "quả xoài", "Mango is yummy."),
      w("fruits", "watermelon", "/ˈwɔː.təˌmel.ən/", "dưa hấu", "Watermelon is cool in summer."),
    ],
  },
  {
    id: "animals",
    titleEn: "Animals",
    titleVi: "Động vật",
    emoji: "🐶",
    color: "#a8dadc",
    words: [
      w("animals", "cat", "/kæt/", "con mèo", "The cat says meow."),
      w("animals", "dog", "/dɒɡ/", "con chó", "My dog can run."),
      w("animals", "bird", "/bɜːd/", "con chim", "Birds can fly."),
      w("animals", "fish", "/fɪʃ/", "con cá", "Fish swim in water."),
      w("animals", "rabbit", "/ˈræb.ɪt/", "con thỏ", "The rabbit hops."),
      w("animals", "lion", "/ˈlaɪ.ən/", "con sư tử", "The lion is strong."),
    ],
  },
  {
    id: "colors",
    titleEn: "Colors",
    titleVi: "Màu sắc",
    emoji: "🌈",
    color: "#cdb4db",
    words: [
      w("colors", "red", "/red/", "màu đỏ", "The apple is red."),
      w("colors", "blue", "/bluː/", "màu xanh dương", "The sky is blue."),
      w("colors", "green", "/ɡriːn/", "màu xanh lá", "Grass is green."),
      w("colors", "yellow", "/ˈjel.əʊ/", "màu vàng", "The sun is yellow."),
      w("colors", "pink", "/pɪŋk/", "màu hồng", "This flower is pink."),
      w("colors", "black", "/blæk/", "màu đen", "Night is black."),
    ],
  },
  {
    id: "family",
    titleEn: "Family",
    titleVi: "Gia đình",
    emoji: "👨‍👩‍👧",
    color: "#ffc8dd",
    words: [
      w("family", "mom", "/mɒm/", "mẹ", "I hug my mom."),
      w("family", "dad", "/dæd/", "bố", "Dad reads me a story."),
      w("family", "sister", "/ˈsɪs.tər/", "chị / em gái", "My sister plays with me."),
      w("family", "brother", "/ˈbrʌð.ər/", "anh / em trai", "My brother is funny."),
      w("family", "baby", "/ˈbeɪ.bi/", "em bé", "The baby is cute."),
      w("family", "grandma", "/ˈɡræn.mɑː/", "bà", "Grandma gives cookies."),
    ],
  },
  {
    id: "body",
    titleEn: "Body Parts",
    titleVi: "Bộ phận cơ thể",
    emoji: "🦶",
    color: "#bde0fe",
    words: [
      w("body", "head", "/hed/", "đầu", "I nod my head."),
      w("body", "eye", "/aɪ/", "mắt", "I see with my eyes."),
      w("body", "nose", "/nəʊz/", "mũi", "I smell with my nose."),
      w("body", "hand", "/hænd/", "tay", "I wave my hand."),
      w("body", "foot", "/fʊt/", "chân", "I jump on one foot."),
      w("body", "mouth", "/maʊθ/", "miệng", "I smile with my mouth."),
    ],
  },
  {
    id: "food",
    titleEn: "Food",
    titleVi: "Đồ ăn",
    emoji: "🍞",
    color: "#ffd6a5",
    words: [
      w("food", "bread", "/bred/", "bánh mì", "I eat bread for breakfast."),
      w("food", "milk", "/mɪlk/", "sữa", "Milk is white."),
      w("food", "egg", "/eɡ/", "trứng", "An egg is oval."),
      w("food", "rice", "/raɪs/", "cơm", "We eat rice every day."),
      w("food", "cake", "/keɪk/", "bánh ngọt", "Birthday cake is sweet."),
      w("food", "juice", "/dʒuːs/", "nước ép", "Orange juice is tasty."),
    ],
  },
  {
    id: "toys",
    titleEn: "Toys",
    titleVi: "Đồ chơi",
    emoji: "🧸",
    color: "#caffbf",
    words: [
      w("toys", "ball", "/bɔːl/", "quả bóng", "I kick the ball."),
      w("toys", "doll", "/dɒl/", "búp bê", "My doll has a dress."),
      w("toys", "car", "/kɑː/", "xe ô tô đồ chơi", "The toy car goes vroom."),
      w("toys", "kite", "/kaɪt/", "diều", "The kite flies high."),
      w("toys", "blocks", "/blɒks/", "xếp hình", "I build with blocks."),
      w("toys", "robot", "/ˈrəʊ.bɒt/", "robot đồ chơi", "The robot beeps."),
    ],
  },
];

export function getLessonById(lessonId) {
  return KIDS_VOCAB_LESSONS.find((l) => l.id === lessonId) || null;
}
