import { kidWordAudioUrl, kidWordImageUrl } from "@/lib/kids-vocabulary/utils";

const STORY_ID = "story-1-1-the-lion-and-the-rabbit";

function v(word, phonetic, vi) {
  return {
    id: `${STORY_ID}:${word}`,
    word,
    phonetic,
    vietnameseMeaning: vi,
    imageUrl: kidWordImageUrl(word),
    audioUrl: kidWordAudioUrl(word),
  };
}

const WORDS = [
  v("cruel", "/ˈkruːəl/", "Hung bạo"),
  v("lot", "/lɒt/", "Nhiều"),
  v("afraid", "/əˈfreɪd/", "Sợ hãi"),
  v("promise", "/ˈprɒmɪs/", "Hứa"),
  v("hunt", "/hʌnt/", "Săn bắt"),
  v("well", "/wel/", "Ổn, tốt"),
  v("agree", "/əˈɡriː/", "Đồng ý"),
  v("safe", "/seɪf/", "An toàn"),
  v("finally", "/ˈfaɪnəli/", "Cuối cùng"),
  v("angry", "/ˈæŋɡri/", "Bực tức, tức giận"),
  v("arrive", "/əˈraɪv/", "Đến nơi"),
  v("hide", "/haɪd/", "Trốn"),
  v("reply", "/rɪˈplaɪ/", "Trả lời"),
  v("middle", "/ˈmɪdl/", "Giữa"),
  v("bottom", "/ˈbɒtəm/", "Dưới đáy"),
  v("moment", "/ˈməʊmənt/", "Khoảnh khắc"),
  v("attack", "/əˈtæk/", "Tấn công"),
  v("pleased", "/pliːzd/", "Vui lòng"),
  v("clever", "/ˈklevə/", "Thông minh"),
  v("trick", "/trɪk/", "Mẹo"),
];

const GAME_WORDS = [
  "cruel",
  "afraid",
  "promise",
  "hunt",
  "agree",
  "safe",
  "angry",
  "arrive",
  "hide",
  "reply",
  "middle",
  "bottom",
  "attack",
  "clever",
  "trick",
  "finally",
  "well",
  "moment",
  "pleased",
  "lot",
];

/** Một đoạn liền — hiển thị ở tab Truyện (Việt lẫn từ Anh). */
export const LION_RABBIT_STORY_TAB_TEXT =
  "Một con Sư Tử cruel sống trong rừng. Hằng ngày, nó giết và ăn rất lot loài vật. Muông thú afraid rằng Sư Tử sẽ giết và ăn thịt tất cả loài vật trong khu rừng. Chúng nói với Sư Tử rằng: “Chúng ta hãy thoả thuận. Nếu ngài promise rằng mỗi ngày ngài chỉ ăn một con vật, thì hằng ngày một trong số chúng tôi sẽ tới đây nộp mạng. Ngài sẽ không phải hunt và giết chúng tôi nữa”. Sư Tử thấy thoả thuận nghe rất well nên nó đã agreed, nhưng nó cũng nói rằng: “Nếu mỗi ngày không có một đứa tới nạp mạng, tao sẽ giết tất cả chúng mày vào ngày hôm sau!”. Cứ như vậy, mỗi ngày một con vật lại tới nộp mạng cho Sư Tử. Và như thế, tất cả muông loài đều safe. Finally, đến lượt Thỏ tới nộp mạng cho Sư Tử. Thỏ hôm đó tới rất muộn nên Sư Tử rất angry khi thỏ arrived. Sư Tử tức giận hỏi thỏ: “Tại sao mày tới muộn?” “Tôi đã hiding khỏi một con Sư Tử khác trong rừng. Con Sư Tử đó là chúa sơn lâm, nên tôi rất sợ hãi”. “Tao là chúa sơn lâm duy nhất trong khu rừng này. Đưa tao tới gặp con Sư Tử đó, tao sẽ giết chết nó” – Sư Tử nói với Thỏ. Thỏ replied: “Tôi rất vui mừng được chỉ cho ngài nơi hắn sống”. Thỏ đưa Sư Tử tới một chiếc giếng cũ ở middle khu rừng. Chiếc giếng sâu hun hút và có nước ở bottom. Thỏ nói với Sư Tử: “Ngài hãy nhìn vào trong này. Hắn sống ở dưới đáy kia kìa”. Khi Sư Tử nhìn xuống đáy giếng, nó thấy chính khuôn mặt mình in trên mặt nước. Nó nghĩ đó là con Sư Tử kia. Không đợi một moment nào, Sư Tử nhảy xuống giếng để attack con Sư Tử kia. Nó không bao giờ có thể thoát ra được nữa. Tất cả các loài vật khác trong rừng đều rất pleased với clever trick của Thỏ.";

export const LION_RABBIT_STORY = {
  id: STORY_ID,
  num: "1.1",
  titleEn: "The Lion and the Rabbit",
  titleVi: "Sư tử và thỏ",
  emoji: "🦁",
  color: "#ffd166",
  storyTabText: LION_RABBIT_STORY_TAB_TEXT,
  paragraphs: [
    {
      en: "A cruel lion lived in the forest. Every day, he killed and ate a lot of animals. The other animals were afraid the lion would kill them all.",
      vi: "Một con Sư Tử cruel sống trong rừng. Hằng ngày, nó giết và ăn rất lot loài vật. Muông thú afraid rằng Sư Tử sẽ giết và ăn thịt tất cả loài vật trong khu rừng.",
    },
    {
      en: 'The animals told the lion, "Let\'s make a deal. If you promise to eat only one animal each day, then one of us will come to you every day. Then you don\'t have to hunt and kill us."',
      vi: "Chúng nói với Sư Tử rằng: “Chúng ta hãy thoả thuận. Nếu ngài promise rằng mỗi ngày ngài chỉ ăn một con vật, thì hằng ngày một trong số chúng tôi sẽ tới đây nộp mạng. Ngài sẽ không phải hunt và giết chúng tôi nữa”.",
    },
    {
      en: 'The plan sounded well to the lion, so he agreed, but he also said, "If you don\'t come every day, I will kill all of you the next day!"',
      vi: "Sư Tử thấy thoả thuận nghe rất well nên nó đã agreed, nhưng nó cũng nói rằng: “Nếu mỗi ngày không có một đứa tới nạp mạng, tao sẽ giết tất cả chúng mày vào ngày hôm sau!”.",
    },
    {
      en: "Each day after that, one animal went to the lion so that the lion could eat it. Then, all the other animals were safe.",
      vi: "Cứ như vậy, mỗi ngày một con vật lại tới nộp mạng cho Sư Tử. Và như thế, tất cả muông loài đều safe.",
    },
    {
      en: "Finally, it was the rabbit's turn to go to the lion. The rabbit went very slowly that day, so the lion was angry when the rabbit arrived.",
      vi: "Finally, đến lượt Thỏ tới nộp mạng cho Sư Tử. Thỏ hôm đó tới rất muộn nên Sư Tử rất angry khi thỏ arrived.",
    },
    {
      en: 'The lion angrily asked the rabbit, "Why are you late?"',
      vi: "Sư Tử tức giận hỏi thỏ: “Tại sao mày tới muộn?”",
    },
    {
      en: '"I was hiding from another lion in the forest. That lion said he was the king, so I was afraid."',
      vi: "“Tôi đã hiding khỏi một con Sư Tử khác trong rừng. Con Sư Tử đó là chúa sơn lâm, nên tôi rất sợ hãi”.",
    },
    {
      en: 'The lion told the rabbit, "I am the only king here! Take me to that other lion, and I will kill him."',
      vi: "“Tao là chúa sơn lâm duy nhất trong khu rừng này. Đưa tao tới gặp con Sư Tử đó, tao sẽ giết chết nó” – Sư Tử nói với Thỏ.",
    },
    {
      en: 'The rabbit replied, "I will be happy to show you where he lives."',
      vi: "Thỏ replied: “Tôi rất vui mừng được chỉ cho ngài nơi hắn sống”.",
    },
    {
      en: 'The rabbit led the lion to an old well in the middle of the forest. The well was very deep with water at the bottom. The rabbit told the lion, "Look in there. The lion lives at the bottom." When the lion looked in the well, he could see his own face in the water. He thought that was the other lion. Without waiting another moment, the lion jumped into the well to attack the other lion. He never came out.',
      vi: "Thỏ đưa Sư Tử tới một chiếc giếng cũ ở middle khu rừng. Chiếc giếng sâu hun hút và có nước ở bottom. Thỏ nói với Sư Tử: “Ngài hãy nhìn vào trong này. Hắn sống ở dưới đáy kia kìa”. Khi Sư Tử nhìn xuống đáy giếng, nó thấy chính khuôn mặt mình in trên mặt nước. Nó nghĩ đó là con Sư Tử kia. Không đợi một moment nào, Sư Tử nhảy xuống giếng để attack con Sư Tử kia. Nó không bao giờ có thể thoát ra được nữa.",
    },
    {
      en: "All of the other animals in the forest were very pleased with the rabbit's clever trick.",
      vi: "Tất cả các loài vật khác trong rừng đều rất pleased với clever trick của Thỏ.",
    },
  ],
  vocabulary: WORDS,
  questions: [
    {
      id: "q1",
      questionVi: "Vì sao muông thú sợ Sư Tử?",
      questionEn: "Why were the animals afraid of the lion?",
      options: ["The lion killed many animals", "The lion was small", "The lion slept all day"],
      correctIndex: 0,
    },
    {
      id: "q2",
      questionVi: "Thỏ đến muộn vì lý do gì?",
      questionEn: "Why was the rabbit late?",
      options: ["He was hiding from another lion", "He was eating grass", "He was sleeping"],
      correctIndex: 0,
    },
    {
      id: "q3",
      questionVi: "Sư Tử nhảy xuống giếng vì nghĩ gì?",
      questionEn: "Why did the lion jump into the well?",
      options: ["He saw another lion in the water", "He wanted to swim", "He was thirsty"],
      correctIndex: 0,
    },
    {
      id: "q4",
      questionVi: "Cuối truyện, muông thú cảm thấy thế nào về Thỏ?",
      questionEn: "How did the animals feel about the rabbit at the end?",
      options: ["Pleased with his clever trick", "Angry at him", "Afraid of him"],
      correctIndex: 0,
    },
  ],
  games: {
    listenChoose: GAME_WORDS.slice(0, 10),
    dragDrop: GAME_WORDS.slice(0, 10),
    fillBlank: [
      {
        prompt: "A ______ lion lived in the forest.",
        promptVi: "Một con Sư Tử ______ sống trong rừng.",
        options: ["cruel", "safe", "pleased"],
        correctIndex: 0,
      },
      {
        prompt: "The other animals were ______.",
        promptVi: "Muông thú ______.",
        options: ["afraid", "angry", "clever"],
        correctIndex: 0,
      },
      {
        prompt: "If you ______ to eat only one animal each day...",
        promptVi: "Nếu ngài ______ rằng mỗi ngày chỉ ăn một con vật...",
        options: ["promise", "hide", "attack"],
        correctIndex: 0,
      },
      {
        prompt: "You don't have to ______ and kill us.",
        promptVi: "Ngài sẽ không phải ______ và giết chúng tôi nữa.",
        options: ["hunt", "reply", "arrive"],
        correctIndex: 0,
      },
      {
        prompt: "The plan sounded ______ to the lion.",
        promptVi: "Thoả thuận nghe rất ______.",
        options: ["well", "cruel", "bottom"],
        correctIndex: 0,
      },
      {
        prompt: "So he ______, but he also made a threat.",
        promptVi: "Nó đã ______, nhưng cũng đe dọa.",
        options: ["agreed", "hid", "attacked"],
        correctIndex: 0,
      },
      {
        prompt: "All the other animals were ______.",
        promptVi: "Tất cả muông loài đều ______.",
        options: ["safe", "angry", "afraid"],
        correctIndex: 0,
      },
      {
        prompt: "______ , it was the rabbit's turn.",
        promptVi: "______ , đến lượt Thỏ.",
        options: ["Finally", "Well", "Middle"],
        correctIndex: 0,
      },
      {
        prompt: "The lion was ______ when the rabbit arrived.",
        promptVi: "Sư Tử rất ______ khi thỏ arrived.",
        options: ["angry", "pleased", "safe"],
        correctIndex: 0,
      },
      {
        prompt: "They were ______ with the rabbit's clever trick.",
        promptVi: "Mọi người rất ______ với clever trick của Thỏ.",
        options: ["pleased", "afraid", "cruel"],
        correctIndex: 0,
      },
    ],
  },
};
