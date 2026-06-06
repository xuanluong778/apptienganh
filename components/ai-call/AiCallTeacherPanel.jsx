"use client";

import AITeacherAvatar from "./AITeacherAvatar";
import TeacherSubtitle from "./TeacherSubtitle";
import VoiceWaveform from "./VoiceWaveform";

/** @typedef {'speaking' | 'guide'} SpeakingTabId */

export default function AiCallTeacherPanel({
  teacher,
  teacherStatus = "idle",
  speakingTab = "speaking",
  onSpeakingTab,
  currentLine,
  pronunciationScore = null,
  onOpenTeacherPicker,
  onListenSample,
  isSpeaking = false,
  subtitle = "",
  speechProvider = "",
  audioEl = null,
  avatarAnimated = true,
}) {
  const waveformActive =
    isSpeaking || teacherStatus === "speaking" || teacherStatus === "correcting" || teacherStatus === "encouraging";

  const isSpeakingTab = speakingTab === "speaking";

  return (
    <aside
      className={`ai-call-teacher${waveformActive ? " ai-call-teacher--speaking" : ""}`}
      aria-label="Giáo viên AI"
    >
      <div className="ai-call-teacher__media">
        <AITeacherAvatar
          teacher={teacher}
          teacherStatus={teacherStatus}
          isSpeaking={isSpeaking}
          audioEl={audioEl}
          animated={avatarAnimated}
          onOpenTeacherPicker={onOpenTeacherPicker}
        />

        <VoiceWaveform active={waveformActive} />
        <TeacherSubtitle text={subtitle} isSpeaking={waveformActive} provider={speechProvider} />
      </div>

      <div className="ai-call-teacher__content">
        <div className="ai-call-teacher__tabs" role="tablist" aria-label="Chế độ luyện nói">
          <button
            type="button"
            role="tab"
            aria-selected={isSpeakingTab}
            className={`ai-call-teacher__tab${isSpeakingTab ? " ai-call-teacher__tab--active" : ""}`}
            onClick={() => onSpeakingTab?.("speaking")}
          >
            Luyện nói
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isSpeakingTab}
            className={`ai-call-teacher__tab${!isSpeakingTab ? " ai-call-teacher__tab--active" : ""}`}
            onClick={() => onSpeakingTab?.("guide")}
          >
            Hướng dẫn
          </button>
        </div>

        <p className="ai-call-teacher__tabMobileLabel" aria-hidden>
          {isSpeakingTab ? "Luyện nói" : "Hướng dẫn"}
        </p>

        {isSpeakingTab && currentLine ? (
          <div className="ai-call-teacher__speakingCard">
            <div className="ai-call-teacher__speakingHead">
              <h3>{currentLine.en}</h3>
              {pronunciationScore != null ? (
                <div className="ai-call-teacher__scoreRing" aria-label={`Phát âm ${pronunciationScore}/100`}>
                  <span>{pronunciationScore}</span>
                  <small>Phát âm</small>
                </div>
              ) : null}
            </div>
            <p className="ai-call-teacher__speakingVi">{currentLine.vi}</p>
            <p className="ai-call-teacher__speakingHint">{currentLine.hint}</p>
            <ul className="ai-call-teacher__speakingGoals">
              {(currentLine.goals || []).map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
            <button type="button" className="ai-call-teacher__listenBtn" onClick={onListenSample}>
              🔊 Nghe câu mẫu
            </button>
          </div>
        ) : (
          <div className="ai-call-teacher__guide">
            <h3>Cách luyện nói</h3>
            <p>Nghe câu mẫu, bấm micro và nói lại bằng tiếng Anh. AI sẽ giải thích bằng tiếng Việt và gợi ý câu đúng.</p>
            <ul>
              <li>Chọn tab <strong>Luyện nói</strong> để xem câu đang luyện</li>
              <li>Nói chậm, rõ từng âm tiết</li>
              <li>Nghe phản hồi trước khi sang câu tiếp theo</li>
              <li>Bấm &quot;Thêm lỗi vào ôn tập&quot; để lưu câu hay sai</li>
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
