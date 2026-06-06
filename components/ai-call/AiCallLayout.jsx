"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startPatientSpeechRecognition } from "@/lib/browser-patient-speech";
import { stopEnglishSpeech } from "@/lib/lessons/speak-english-client";
import { primeSpeechEngines } from "@/lib/lessons/prime-speech";
import { getTeacherById, getTeacherVoiceName, normalizeSelectedTeacher } from "@/lib/lessons/ai-teachers";
import { getLessonPackByScenario } from "@/lib/ai-call/lesson-packs";
import { addMistakeBookmark, loadMistakeBookmarks } from "@/lib/ai-call/mistake-bookmarks";
import { clientEvaluateSpeech } from "@/lib/ai-call/client-evaluate-fallback";
import {
  buildListenCorrectSegments,
  buildSampleLineSegments,
  buildTeacherSpeechSegments,
  buildWelcomeSegments,
} from "@/lib/ai-call/teacher-speech-segments";
import { useAiTeacherVoice } from "@/hooks/useAiTeacherVoice";
import SpeakingModeBar from "@/components/speaking/SpeakingModeBar";
import TeacherPickerModal from "@/components/voice-call/TeacherPickerModal";
import AiCallTopBar from "./AiCallTopBar";
import AiCallTeacherPanel from "./AiCallTeacherPanel";
import AiCallStudentPanel from "./AiCallStudentPanel";
import AiCallControlBar, { AiCallSessionSummary } from "./AiCallControlBar";
import "./ai-call.css";

const VOICE_ERRORS = {
  unsupported: "Trình duyệt không hỗ trợ nhận giọng — dùng Chrome hoặc Edge.",
  "not-allowed": "Micro bị chặn — cho phép micro trong trình duyệt.",
  "no-speech": "Không nghe thấy — hãy nói rõ hơn.",
};

function scrollTranscriptToBottom(listRef) {
  window.setTimeout(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, 120);
}

function buildAssistantMessage(result, currentLine = {}) {
  if (!result) return "";
  if (result.is_correct) {
    return result.teacher_reply || "Great job! Let's continue.";
  }
  const why = Array.isArray(result.why_wrong) ? result.why_wrong.filter(Boolean) : [];
  const lines = [];
  if (why.length) lines.push(why.join(" "));
  const meaningVi = String(currentLine.vi || "").trim();
  if (meaningVi) lines.push(`📖 Nghĩa câu: ${meaningVi}`);
  if (result.correct_sentence) lines.push(`Câu đúng: ${result.correct_sentence}`);
  const repeat = result.say_again || result.correct_sentence;
  if (repeat) lines.push(`Hãy nói lại: ${repeat}`);
  if (result.teacher_reply) lines.push(result.teacher_reply);
  return lines.join("\n\n");
}

export default function AiCallLayout({
  sessionMode = "voice_call",
  onSessionModeChange,
  activeScenarioId = "",
  onScenarioPick,
  selectedTeacher = "bunny",
  onSelectTeacher,
  onEndSession,
}) {
  const [phase, setPhase] = useState("active");
  const [teacherStatus, setTeacherStatus] = useState("idle");
  const [speakingTab, setSpeakingTab] = useState("speaking");
  const [lineIndex, setLineIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [lastScores, setLastScores] = useState(null);
  const [reviewAdded, setReviewAdded] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [micMuted, setMicMuted] = useState(false);
  const [avatarAnimated, setAvatarAnimated] = useState(true);
  const [correctionHighlighted, setCorrectionHighlighted] = useState(false);
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [translateText, setTranslateText] = useState("");
  const [stats, setStats] = useState({ sentences: 0, errors: 0, review: 0 });
  const [audioEl, setAudioEl] = useState(null);
  const [canReplay, setCanReplay] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);

  const recognitionRef = useRef(null);
  const listRef = useRef(null);
  const initializedRef = useRef(false);
  const welcomeSpokenRef = useRef(false);

  const teacher = useMemo(() => getTeacherById(selectedTeacher), [selectedTeacher]);
  const teacherName = useMemo(() => getTeacherVoiceName(teacher), [teacher]);
  const lessonPack = useMemo(() => getLessonPackByScenario(activeScenarioId), [activeScenarioId]);
  const currentLine = lessonPack.lines[lineIndex] || lessonPack.lines[0];

  const handleSpeakingChange = useCallback((speaking) => {
    if (!speaking) {
      setTeacherStatus((prev) =>
        prev === "correcting" || prev === "encouraging" || prev === "speaking" ? "idle" : prev
      );
    }
  }, []);

  const { speak, stop: stopTeacherVoice, replayLast, isSpeaking, subtitle, provider } = useAiTeacherVoice({
    enabled: speakerOn,
    onAudioElement: setAudioEl,
    onSpeakingChange: handleSpeakingChange,
  });

  useEffect(() => {
    if (phase !== "active") return undefined;
    const t = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    setStats((s) => ({ ...s, review: loadMistakeBookmarks().length }));
  }, [reviewAdded]);

  const speakWithStatus = useCallback(
    async (segments, status = "speaking") => {
      if (!speakerOn || !segments?.length) {
        setTeacherStatus("idle");
        return;
      }
      setTeacherStatus(status);
      setCanReplay(true);
      await speak(segments);
    },
    [speakerOn, speak]
  );

  useEffect(() => {
    if (initializedRef.current || phase !== "active") return;
    initializedRef.current = true;
    const welcomeEn = `Hi! I'm ${teacherName}. Let's practice: "${currentLine.en}"`;
    setMessages([{ id: `a-${Date.now()}`, role: "assistant", text: welcomeEn, time: new Date().toISOString() }]);
    setNotice("Bấm micro hoặc 🔊 Nghe mẫu để bắt đầu — giọng tiếng Việt cần thao tác bấm một lần.");
  }, [phase, teacherName, currentLine.en]);

  const maybeSpeakWelcome = useCallback(() => {
    if (!speakerOn || welcomeSpokenRef.current) return;
    welcomeSpokenRef.current = true;
    primeSpeechEngines();
    void speakWithStatus(buildWelcomeSegments(teacherName, currentLine.en, currentLine.vi), "speaking");
  }, [speakerOn, speakWithStatus, teacherName, currentLine.en, currentLine.vi]);

  useEffect(() => {
    scrollTranscriptToBottom(listRef);
  }, [messages.length, evaluation, translateText]);

  const historyForApi = useMemo(
    () =>
      messages.slice(-10).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      })),
    [messages]
  );

  const runEvaluate = useCallback(
    async (spokenText) => {
      primeSpeechEngines();
      const said = String(spokenText || "").trim();
      if (!said) {
        setNotice(VOICE_ERRORS["no-speech"]);
        return;
      }

      setBusy(true);
      setTeacherStatus("thinking");
      setNotice("");
      setReviewAdded(false);
      setCorrectionHighlighted(false);
      stopTeacherVoice();

      const userMsg = { id: `u-${Date.now()}`, role: "user", text: said, time: new Date().toISOString() };
      setMessages((prev) => [...prev, userMsg]);

      let result = null;
      try {
        const res = await fetch("/api/ai-call/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            spoken_text: said,
            target_sentence: currentLine.en,
            lesson_context: `${lessonPack.title} — ${lessonPack.titleVi}`,
            level: lessonPack.level,
            history: historyForApi,
            selected_teacher: normalizeSelectedTeacher(selectedTeacher),
          }),
        });
        const json = await res.json();
        if (res.ok && json?.success && json?.data) {
          result = json.data;
        } else if (res.status === 401) {
          result = clientEvaluateSpeech({ spokenText: said, targetSentence: currentLine.en });
        } else {
          setNotice(json?.message || "Không phân tích được — thử lại.");
          result = clientEvaluateSpeech({ spokenText: said, targetSentence: currentLine.en });
        }
      } catch {
        result = clientEvaluateSpeech({ spokenText: said, targetSentence: currentLine.en });
      }

      if (result) {
        setEvaluation(result);
        setLastScores(result.scores);
        setStats((s) => ({
          sentences: s.sentences + 1,
          errors: s.errors + (result.is_correct ? 0 : 1),
          review: s.review,
        }));

        const segments = buildTeacherSpeechSegments(result, currentLine);
        const status = result.is_correct ? "encouraging" : "correcting";
        const displayText = buildAssistantMessage(result, currentLine);

        if (displayText) {
          const aiMsg = {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: displayText,
            time: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, aiMsg]);
        }

        if (!result.is_correct) {
          setCorrectionHighlighted(true);
          setCorrectionModalOpen(false);
          scrollTranscriptToBottom(listRef);
        } else {
          setCorrectionModalOpen(false);
        }

        await speakWithStatus(segments, status);

        if (result.is_correct && lineIndex < lessonPack.lines.length - 1) {
          window.setTimeout(() => setLineIndex((i) => i + 1), 1200);
        }
      } else {
        setTeacherStatus("idle");
      }

      setBusy(false);
    },
    [
      currentLine,
      historyForApi,
      lessonPack.level,
      lessonPack.lines.length,
      lessonPack.title,
      lessonPack.titleVi,
      lineIndex,
      selectedTeacher,
      speakWithStatus,
      stopTeacherVoice,
    ]
  );

  const startMic = useCallback(() => {
    if (micMuted || busy) return;
    primeSpeechEngines();
    stopTeacherVoice();
    stopEnglishSpeech();
    setTeacherStatus("listening");
    setNotice("Đang nghe… nói tiếng Anh rồi bấm micro lần nữa để gửi.");

    const ctrl = startPatientSpeechRecognition({
      lang: "en-US",
      silenceMs: 2400,
      maxMs: 20000,
      onInterim: () => {},
      onDone: (transcript) => {
        setRecording(false);
        recognitionRef.current = null;
        void runEvaluate(transcript);
      },
      onError: (err) => {
        setRecording(false);
        recognitionRef.current = null;
        setTeacherStatus("idle");
        const key = String(err || "");
        if (key !== "aborted") setNotice(VOICE_ERRORS[key] || "Lỗi micro — thử lại.");
      },
    });

    if (!ctrl) {
      setTeacherStatus("idle");
      setNotice(VOICE_ERRORS.unsupported);
      return;
    }
    recognitionRef.current = ctrl;
    setRecording(true);
  }, [busy, micMuted, runEvaluate, stopTeacherVoice]);

  const stopMic = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      setRecording(false);
    }
  }, []);

  const handleMic = useCallback(() => {
    if (recording) stopMic();
    else startMic();
  }, [recording, startMic, stopMic]);

  const handleListenSample = useCallback(() => {
    primeSpeechEngines();
    maybeSpeakWelcome();
    void speakWithStatus(buildSampleLineSegments(currentLine.en, currentLine.vi), "speaking");
  }, [currentLine.en, currentLine.vi, maybeSpeakWelcome, speakWithStatus]);

  const handleListenCorrect = useCallback(() => {
    primeSpeechEngines();
    const t = evaluation?.correct_sentence || evaluation?.say_again || currentLine.en;
    void speakWithStatus(buildListenCorrectSegments(t, currentLine.vi), "correcting");
  }, [currentLine.en, currentLine.vi, evaluation, speakWithStatus]);

  const handleSpeakAgain = useCallback(() => {
    startMic();
  }, [startMic]);

  const handleReplayTeacher = useCallback(() => {
    primeSpeechEngines();
    if (evaluation) {
      void speakWithStatus(
        buildTeacherSpeechSegments(evaluation, currentLine),
        evaluation.is_correct ? "encouraging" : "correcting"
      );
      return;
    }
    void replayLast();
  }, [currentLine, evaluation, replayLast, speakWithStatus]);

  const handleAddReview = useCallback(() => {
    if (!evaluation) return;
    const ok = addMistakeBookmark({
      youSaid: evaluation.you_said,
      correct: evaluation.correct_sentence,
      why: evaluation.why_wrong,
    });
    if (ok) {
      setReviewAdded(true);
      setStats((s) => ({ ...s, review: loadMistakeBookmarks().length }));
    }
  }, [evaluation]);

  const handleHint = useCallback(() => {
    primeSpeechEngines();
    void speakWithStatus(buildSampleLineSegments(currentLine.en, currentLine.vi), "speaking");
    setNotice(currentLine.hint);
  }, [currentLine, speakWithStatus]);

  const handleShellActivate = useCallback(() => {
    primeSpeechEngines();
  }, []);

  const handleTranslate = useCallback(async () => {
    const text = evaluation?.correct_sentence || currentLine.en;
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ text, target: "vi" }),
      });
      const json = await res.json();
      const tr = json?.data?.translated || json?.translation || "";
      setTranslateText(tr || "Không dịch được lúc này.");
    } catch {
      setTranslateText(currentLine.vi);
    }
  }, [currentLine, evaluation]);

  const handleSendText = useCallback(() => {
    const t = textInput.trim();
    if (!t) return;
    setShowTextInput(false);
    setTextInput("");
    void runEvaluate(t);
  }, [runEvaluate, textInput]);

  const handleEnd = useCallback(() => {
    stopTeacherVoice();
    stopEnglishSpeech();
    try {
      recognitionRef.current?.abort?.();
    } catch {
      /* ignore */
    }
    setPhase("ended");
    onEndSession?.();
  }, [onEndSession, stopTeacherVoice]);

  const statusHint =
    translateText ||
    notice ||
    (teacherStatus === "listening" ? "Đang nghe học viên…" : "") ||
    (teacherStatus === "thinking" ? "AI đang phân tích câu của bạn…" : "");

  if (phase === "ended") {
    return (
      <div className="ai-call-shell ai-call-shell--ended">
        <div className="ai-call-ended">
          <h2>Buổi học đã kết thúc</h2>
          <p>
            Bạn đã luyện <strong>{stats.sentences}</strong> câu, sửa <strong>{stats.errors}</strong> lỗi.
          </p>
          <button type="button" className="ai-call-ended__btn" onClick={() => onSessionModeChange?.("scenario")}>
            Quay lại luyện nói
          </button>
          <button
            type="button"
            className="ai-call-ended__btn ai-call-ended__btn--primary"
            onClick={() => {
              setPhase("active");
              setElapsedSec(0);
              setMessages([]);
              setEvaluation(null);
              initializedRef.current = false;
            }}
          >
            Gọi lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-call-shell" onPointerDown={handleShellActivate}>
      <SpeakingModeBar sessionMode={sessionMode} onModeChange={onSessionModeChange} disabled={busy || recording} />

      <AiCallTopBar
        lessonTitle={lessonPack.title}
        levelLabel={lessonPack.level}
        elapsedSec={elapsedSec}
        speakerOn={speakerOn}
        micMuted={micMuted}
        avatarAnimated={avatarAnimated}
        canReplay={canReplay}
        onSpeakerToggle={() => setSpeakerOn((s) => !s)}
        onMicToggle={() => setMicMuted((m) => !m)}
        onAvatarToggle={() => setAvatarAnimated((v) => !v)}
        onReplayTeacher={handleReplayTeacher}
        onEnd={handleEnd}
        onBack={() => onSessionModeChange?.("scenario")}
      />

      <div className="ai-call-grid">
        <div className="ai-call-teacher-slot">
          <AiCallTeacherPanel
            teacher={teacher}
            teacherStatus={teacherStatus}
            speakingTab={speakingTab}
            onSpeakingTab={setSpeakingTab}
            currentLine={currentLine}
            pronunciationScore={lastScores?.pronunciation ?? null}
            onOpenTeacherPicker={() => setTeacherModalOpen(true)}
            onListenSample={handleListenSample}
            isSpeaking={isSpeaking}
            subtitle={subtitle}
            speechProvider={provider}
            audioEl={audioEl}
            avatarAnimated={avatarAnimated}
          />
        </div>

        <div className="ai-call-main">
          <AiCallStudentPanel
            messages={messages}
            listRef={listRef}
            evaluation={evaluation}
            scores={lastScores}
            statusHint={statusHint}
            correctionHighlighted={correctionHighlighted}
            correctionModalOpen={correctionModalOpen}
            sentenceMeaning={currentLine.vi}
            onViewCorrection={() => setCorrectionModalOpen(true)}
            onCloseCorrection={() => setCorrectionModalOpen(false)}
            onListenCorrect={handleListenCorrect}
            onSpeakAgain={handleSpeakAgain}
            onAddReview={handleAddReview}
            onReplayTeacher={handleReplayTeacher}
            reviewAdded={reviewAdded}
          />

          <AiCallControlBar
            recording={recording}
            busy={busy}
            onMic={handleMic}
            onType={() => setShowTextInput((v) => !v)}
            onHint={handleHint}
            onTranslate={handleTranslate}
            onEnd={handleEnd}
            textInput={textInput}
            onTextInput={setTextInput}
            onSendText={handleSendText}
            showTextInput={showTextInput}
            onToggleText={() => setShowTextInput((v) => !v)}
          />
        </div>
      </div>

      <AiCallSessionSummary
        stats={stats}
        open={summaryOpen}
        onToggle={() => setSummaryOpen((v) => !v)}
      />

      <TeacherPickerModal
        open={teacherModalOpen}
        selectedTeacherId={selectedTeacher}
        onClose={() => setTeacherModalOpen(false)}
        onConfirm={(id) => onSelectTeacher?.(id)}
        lockDuringCall={false}
      />
    </div>
  );
}
