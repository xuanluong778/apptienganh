"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VoiceCall from "@/components/lessons/VoiceCall";
import VoiceCallRoom from "./VoiceCallRoom";
import VoiceCallCoachPanel from "./VoiceCallCoachPanel";
import TeacherPickerModal from "./TeacherPickerModal";
import { getScenarioById } from "@/lib/lessons/speaking-scenarios";
import { getVoiceCallLevel } from "@/lib/lessons/voice-call-levels";
import { buildVoiceCallSummary } from "@/lib/lessons/voice-call-feedback";
import { getAnswerSuggestions } from "@/lib/lessons/speaking-suggestions";
import { getTeacherById, getTeacherVoiceName } from "@/lib/lessons/ai-teachers";
import "./voice-call-room.css";

function speakEnglishText(text, rate = 0.95) {
  const t = String(text || "").trim();
  if (!t || typeof window === "undefined") return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "en-US";
    u.rate = rate;
    window.speechSynthesis.speak(u);
  } catch (_err) {
    /* ignore */
  }
}

export default function VoiceCallLayout({
  sessionMode = "voice_call",
  onSessionModeChange,
  activeScenarioId = "",
  onScenarioPick,
  selectedTeacher = "bunny",
  onSelectTeacher,
}) {
  const [api, setApi] = useState(null);
  const [phase, setPhase] = useState("pre");
  const [levelId, setLevelId] = useState("beginner");
  const [micMuted, setMicMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [summary, setSummary] = useState(null);
  const [translateText, setTranslateText] = useState("");
  const [translateLoading, setTranslateLoading] = useState(false);
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);

  const teacher = useMemo(() => getTeacherById(selectedTeacher), [selectedTeacher]);
  const teacherVoiceName = useMemo(() => getTeacherVoiceName(teacher), [teacher]);
  const teacherEmoji = teacher.emoji || "🦊";

  const scenario = useMemo(() => getScenarioById(activeScenarioId), [activeScenarioId]);
  const level = useMemo(() => getVoiceCallLevel(levelId), [levelId]);
  const connectOnceRef = useRef(false);

  useEffect(() => {
    if (phase !== "active") {
      connectOnceRef.current = false;
      return;
    }
    if (!api || api.isOpen || api.readyState === "connecting" || connectOnceRef.current) return;
    connectOnceRef.current = true;
    void api.connect?.();
  }, [api, phase]);

  useEffect(() => {
    api?.setMicMuted?.(micMuted);
  }, [api, micMuted]);

  useEffect(() => {
    api?.setSpeakerOn?.(speakerOn);
  }, [api, speakerOn]);

  const lastAssistant = useMemo(
    () => [...(api?.messages || [])].reverse().find((m) => m.role === "assistant"),
    [api?.messages]
  );

  const hints = useMemo(
    () => getAnswerSuggestions(lastAssistant?.text || "", ""),
    [lastAssistant?.text]
  );

  const handleStartCall = useCallback(() => {
    setSummary(null);
    setTranslateText("");
    api?.ensureAudio?.();
    api?.setSpeakerOn?.(true);
    setSpeakerOn(true);
    setPhase("active");
  }, [api]);

  const handleEndCall = useCallback(() => {
    const built = buildVoiceCallSummary({
      messages: api?.messages || [],
      scenarioLabel: scenario?.label || "",
      levelLabel: level.label,
    });
    setSummary(built);
    api?.disconnect?.();
    setPhase("post");
  }, [api, level.label, scenario?.label]);

  const handleCallAgain = useCallback(() => {
    setSummary(null);
    setTranslateText("");
    setMicMuted(false);
    setSpeakerOn(true);
    setPhase("pre");
  }, []);

  const handleMicToggle = useCallback(() => {
    if (!api?.isOpen) return;
    api.ensureAudio?.();
    if (api.capturing || api.awaitingRecognitionStart) {
      api.pttUp?.();
    } else {
      if (api.ttsPlaying) {
        api.interruptPlayback?.();
      }
      api.pttDown?.();
    }
  }, [api]);

  const handleMuteToggle = useCallback(() => {
    setMicMuted((m) => !m);
  }, []);

  const handleSpeakerToggle = useCallback(() => {
    setSpeakerOn((s) => !s);
  }, []);

  const handleTranslate = useCallback(async () => {
    const text = String(lastAssistant?.text || "").trim();
    if (!text) return;
    setTranslateLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ text, target: "vi" }),
      });
      const json = await res.json();
      if (res.ok && json?.success && json?.data?.translated) {
        setTranslateText(String(json.data.translated));
      } else if (res.ok && json?.translation) {
        setTranslateText(String(json.translation));
      }
    } catch (_e) {
      setTranslateText("Không dịch được lúc này — thử lại sau.");
    } finally {
      setTranslateLoading(false);
    }
  }, [lastAssistant?.text]);

  const handleHint = useCallback(() => {
    const h = hints[0];
    if (h) speakEnglishText(h, 0.88);
  }, [hints]);

  const handleSpeakSlow = useCallback(() => {
    if (lastAssistant?.text) speakEnglishText(lastAssistant.text, 0.72);
  }, [lastAssistant?.text]);

  const handleOpenTeacherPicker = useCallback(() => {
    setTeacherModalOpen(true);
  }, []);

  const handleConfirmTeacher = useCallback(
    (teacherId) => {
      onSelectTeacher?.(teacherId);
    },
    [onSelectTeacher]
  );

  return (
    <>
      <VoiceCall headless userFriendly onApiReady={setApi} />
      <div className="voice-call-grid">
        <VoiceCallRoom
          phase={phase}
          api={api}
          sessionMode={sessionMode}
          onSessionModeChange={onSessionModeChange}
          scenarioId={activeScenarioId}
          onScenarioPick={onScenarioPick}
          levelId={levelId}
          onLevelChange={setLevelId}
          teacher={teacher}
          teacherName={teacherVoiceName}
          teacherEmoji={teacherEmoji}
          onOpenTeacherPicker={handleOpenTeacherPicker}
          micMuted={micMuted}
          speakerOn={speakerOn}
          onMicToggle={handleMicToggle}
          onMuteToggle={handleMuteToggle}
          onSpeakerToggle={handleSpeakerToggle}
          onTranslate={handleTranslate}
          onHint={handleHint}
          onSpeakSlow={handleSpeakSlow}
          onStartCall={handleStartCall}
          onEndCall={handleEndCall}
          onCallAgain={handleCallAgain}
          translateLoading={translateLoading}
        />
        <VoiceCallCoachPanel
          phase={phase}
          api={api}
          summary={summary}
          scenarioLabel={scenario?.label || ""}
          levelLabel={level.label}
          translateText={translateText}
          hints={hints}
          teacher={teacher}
          onOpenTeacherPicker={handleOpenTeacherPicker}
          onSpeakText={speakEnglishText}
          onCallAgain={handleCallAgain}
        />
      </div>

      <TeacherPickerModal
        open={teacherModalOpen}
        selectedTeacherId={selectedTeacher}
        onClose={() => setTeacherModalOpen(false)}
        onConfirm={handleConfirmTeacher}
        lockDuringCall={phase === "active"}
      />
    </>
  );
}
