/**
 * Offline / deterministic replies when AI is unavailable or rejected.
 */

export function buildFallbackReply(message) {
  const m = String(message || "").trim();
  const lower = m.toLowerCase();
  if (/\bhow are you\b/.test(lower)) {
    return {
      reply:
        "I am great, thank you for asking! I am excited to practice English with you. How is your day going so far?",
      corrected_sentence: "How are you?",
      ipa: "/aɪ/ /æm/ /ɡreɪt/ /θæŋk/ /juː/",
      pronunciation_tip: "Stress HOW and YOU clearly: HOW are YOU?",
      mistakes_explanation:
        "Your question is already a good daily question. Make the last word sound friendly with a little rising tone.",
    };
  }

  if (!m) {
    return {
      reply:
        "Hello! Tell me one thing about your day in English, and I will help you say it more naturally. What did you do this morning?",
      corrected_sentence: "Hello! I want to practice English today.",
      ipa: "/həˈloʊ/ /aɪ/ /wɑːnt/ /tə/ /ˈpræktɪs/ /ˈɪŋɡlɪʃ/ /təˈdeɪ/",
      pronunciation_tip: "Open your mouth clearly on stressed syllables: HEL-lo, PRAC-tice, to-DAY.",
      mistakes_explanation:
        "Start with a full sentence: subject + verb + object. Example: I + want + to practice.",
    };
  }

  if (/\b(hello|hi|hey)\b/.test(lower)) {
    return {
      reply: "Hello! Nice to meet you.\nCan you say: Hello, teacher?",
      corrected_sentence: "",
      ipa: "",
      pronunciation_tip: "",
      mistakes_explanation: '"Hello" nghĩa là "Xin chào".',
    };
  }

  if (/\b(who are you|introduce yourself)\b/.test(lower)) {
    return {
      reply:
        "I am your English practice partner! I chat with you, fix small mistakes, and ask questions so you keep talking. What topic do you want to practice first—food, school, or free time?",
      corrected_sentence: "You are my English learning chatbot.",
      ipa: "/aɪ/ /æm/ /jʊr/ /ˈɪŋɡlɪʃ/ /ˈpræktɪs/ /ˈtʃætˌbɑt/",
      pronunciation_tip: "Stress these words: ENG-lish, PRAC-tice, CHAT-bot.",
      mistakes_explanation:
        "Good question format. Use clear stress on WHO and YOU when you ask someone in real life.",
    };
  }

  if (/\b(what|when|where|why|how)\b/.test(lower) && /\?/.test(lower)) {
    return {
      reply:
        "That is a great question! In easy English, try one short idea first, then you can add one reason with “because”. What is your idea in one simple English sentence?",
      corrected_sentence: "Can I answer in simple English? I want to practice.",
      ipa: "/ðæt/ /ɪz/ /ə/ /ɡreɪt/ /ˈkwes.tʃən/",
      pronunciation_tip: "Stress GREAT and QUES-tion. Lift your voice a little at the end of a real question.",
      mistakes_explanation:
        "WH-questions need correct order: question word + helping verb + subject + main verb when needed. Check if you used do/does/did correctly.",
    };
  }

  if (/\b(name is|i am|i'm)\b/.test(lower)) {
    return {
      reply: `Great introduction! ${m} Nice to meet you.`,
      corrected_sentence: "My name is Alex. I am a student.",
      ipa: "/ɡreɪt/ /ˌɪn.trəˈdʌk.ʃən/ /naɪs/ /tuː/ /miːt/ /juː/",
      pronunciation_tip: "Connect sounds smoothly: 'Nice-to-meet-you'.",
      mistakes_explanation:
        "Use My name is … or I am … with capital I. Say your name with clear final consonants.",
    };
  }

  if (/\b(i like|i love|my hobby|hobby)\b/.test(lower)) {
    return {
      reply: "Wonderful! Tell me why you like it.",
      corrected_sentence: "My hobby is reading books because it is relaxing.",
      ipa: "/ˈwʌn.dɚ.fəl/ /tel/ /miː/ /waɪ/ /juː/ /laɪk/ /ɪt/",
      pronunciation_tip: "Stress HOB-by, READ-ing, re-LAX-ing.",
      mistakes_explanation:
        "After I like, use -ing for activities: I like reading. Or use a noun: I like books.",
    };
  }

  return {
    reply:
      `I understand you! You said: "${m}". To sound more natural, use full short sentences and clear stress on important words. Can you say the same idea again in one short sentence?`,
    corrected_sentence: m.endsWith(".") ? m : /\?$/.test(m) ? m : `${m}.`,
    ipa: /[.!?]$/.test(m) ? "/aɪ/ /ˌʌn.dɚˈstænd/ /juː/" : "/pliːz/ /tel/ /miː/ /mɔːr/",
    pronunciation_tip: "Speak slowly and stress key words. Pause briefly between ideas.",
    mistakes_explanation:
      "Check word order (subject before verb), add missing articles (a/the) where needed, and stress content words instead of grammar words.",
  };
}
