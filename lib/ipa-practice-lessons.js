/**
 * Bài luyện IPA tĩnh — từ, IPA gần đúng, nghĩa tiếng Việt.
 * @typedef {{ word: string, ipa: string, vi: string }} IpaPracticeWord
 * @typedef {{ id: string, title: string, words: IpaPracticeWord[] }} IpaPracticeLesson
 */

/** @type {IpaPracticeLesson[]} */
export const IPA_PRACTICE_LESSONS = [
  {
    id: "mn-ng",
    title: "Âm /m/-/n/-/ŋ/",
    words: [
      { word: "moon", ipa: "/muːn/", vi: "mặt trăng" },
      { word: "name", ipa: "/neɪm/", vi: "tên" },
      { word: "sing", ipa: "/sɪŋ/", vi: "hát" },
      { word: "think", ipa: "/θɪŋk/", vi: "nghĩ" },
      { word: "swim", ipa: "/swɪm/", vi: "bơi" },
      { word: "bank", ipa: "/bæŋk/", vi: "ngân hàng" },
    ],
  },
  {
    id: "lr",
    title: "Âm /l/-/r/",
    words: [
      { word: "light", ipa: "/laɪt/", vi: "ánh sáng" },
      { word: "right", ipa: "/raɪt/", vi: "đúng / bên phải" },
      { word: "lake", ipa: "/leɪk/", vi: "hồ" },
      { word: "rake", ipa: "/reɪk/", vi: "cái cào" },
      { word: "fly", ipa: "/flaɪ/", vi: "bay" },
      { word: "cry", ipa: "/kraɪ/", vi: "khóc" },
    ],
  },
  {
    id: "diph-ai-oy",
    title: "Âm /eɪ/-/aɪ/-/ɔɪ/",
    words: [
      { word: "day", ipa: "/deɪ/", vi: "ngày" },
      { word: "train", ipa: "/treɪn/", vi: "tàu hỏa" },
      { word: "eye", ipa: "/aɪ/", vi: "mắt" },
      { word: "time", ipa: "/taɪm/", vi: "thời gian" },
      { word: "boy", ipa: "/bɔɪ/", vi: "cậu bé" },
      { word: "noise", ipa: "/nɔɪz/", vi: "tiếng ồn" },
    ],
  },
  {
    id: "v-f-th",
    title: "Âm /v/-/f/-/θ/",
    words: [
      { word: "voice", ipa: "/vɔɪs/", vi: "giọng nói" },
      { word: "very", ipa: "/ˈver.i/", vi: "rất" },
      { word: "fish", ipa: "/fɪʃ/", vi: "cá" },
      { word: "free", ipa: "/friː/", vi: "miễn phí" },
      { word: "think", ipa: "/θɪŋk/", vi: "suy nghĩ" },
      { word: "three", ipa: "/θriː/", vi: "số ba" },
    ],
  },
  {
    id: "s-z-sh",
    title: "Âm /s/-/z/-/ʃ/",
    words: [
      { word: "sun", ipa: "/sʌn/", vi: "mặt trời" },
      { word: "zoo", ipa: "/zuː/", vi: "sở thú" },
      { word: "shoe", ipa: "/ʃuː/", vi: "đôi giày" },
      { word: "measure", ipa: "/ˈmeʒ.ər/", vi: "đo lường" },
      { word: "ship", ipa: "/ʃɪp/", vi: "con tàu" },
      { word: "zip", ipa: "/zɪp/", vi: "khóa kéo" },
    ],
  },
  {
    id: "short-long-vowels",
    title: "Âm /ɪ/-/iː/-/ʊ/-/uː/",
    words: [
      { word: "sit", ipa: "/sɪt/", vi: "ngồi" },
      { word: "seat", ipa: "/siːt/", vi: "ghế" },
      { word: "full", ipa: "/fʊl/", vi: "đầy" },
      { word: "food", ipa: "/fuːd/", vi: "thức ăn" },
      { word: "pool", ipa: "/puːl/", vi: "bể bơi" },
      { word: "pull", ipa: "/pʊl/", vi: "kéo" },
    ],
  },
  {
    id: "ae-ah",
    title: "Âm /æ/-/ʌ/",
    words: [
      { word: "cat", ipa: "/kæt/", vi: "con mèo" },
      { word: "hat", ipa: "/hæt/", vi: "cái mũ" },
      { word: "cup", ipa: "/kʌp/", vi: "tách" },
      { word: "love", ipa: "/lʌv/", vi: "yêu" },
      { word: "run", ipa: "/rʌn/", vi: "chạy" },
      { word: "black", ipa: "/blæk/", vi: "màu đen" },
    ],
  },
  {
    id: "t-d",
    title: "Âm /t/-/d/",
    words: [
      { word: "tea", ipa: "/tiː/", vi: "trà" },
      { word: "day", ipa: "/deɪ/", vi: "ngày" },
      { word: "town", ipa: "/taʊn/", vi: "thị trấn" },
      { word: "down", ipa: "/daʊn/", vi: "xuống" },
      { word: "door", ipa: "/dɔːr/", vi: "cửa" },
      { word: "take", ipa: "/teɪk/", vi: "lấy" },
    ],
  },
  {
    id: "p-b",
    title: "Âm /p/-/b/",
    words: [
      { word: "pen", ipa: "/pen/", vi: "cây bút" },
      { word: "big", ipa: "/bɪɡ/", vi: "to" },
      { word: "pray", ipa: "/preɪ/", vi: "cầu nguyện" },
      { word: "brain", ipa: "/breɪn/", vi: "não" },
      { word: "spin", ipa: "/spɪn/", vi: "quay" },
      { word: "best", ipa: "/best/", vi: "tốt nhất" },
    ],
  },
  {
    id: "k-g",
    title: "Âm /k/-/ɡ/",
    words: [
      { word: "cat", ipa: "/kæt/", vi: "mèo" },
      { word: "go", ipa: "/ɡoʊ/", vi: "đi" },
      { word: "cold", ipa: "/koʊld/", vi: "lạnh" },
      { word: "gold", ipa: "/ɡoʊld/", vi: "vàng" },
      { word: "quick", ipa: "/kwɪk/", vi: "nhanh" },
      { word: "green", ipa: "/ɡriːn/", vi: "màu xanh lá" },
    ],
  },
  {
    id: "h-w-j",
    title: "Âm /h/-/w/-/j/",
    words: [
      { word: "hello", ipa: "/həˈloʊ/", vi: "xin chào" },
      { word: "hot", ipa: "/hɑːt/", vi: "nóng" },
      { word: "we", ipa: "/wiː/", vi: "chúng ta" },
      { word: "wine", ipa: "/waɪn/", vi: "rượu vang" },
      { word: "yes", ipa: "/jes/", vi: "vâng" },
      { word: "yellow", ipa: "/ˈjel.oʊ/", vi: "màu vàng" },
    ],
  },
  {
    id: "ch-j",
    title: "Âm /tʃ/-/dʒ/",
    words: [
      { word: "chair", ipa: "/tʃeər/", vi: "ghế" },
      { word: "cheese", ipa: "/tʃiːz/", vi: "phô mai" },
      { word: "jeep", ipa: "/dʒiːp/", vi: "xe jeep" },
      { word: "job", ipa: "/dʒɑːb/", vi: "công việc" },
      { word: "watch", ipa: "/wɑːtʃ/", vi: "đồng hồ" },
      { word: "orange", ipa: "/ˈɔːr.ɪndʒ/", vi: "quả cam" },
    ],
  },
];
