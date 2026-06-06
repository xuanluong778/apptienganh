"use client";

import SpeakingModeBar from "./SpeakingModeBar";
import ConversationThread from "./ConversationThread";
import AnswerSuggestions from "./AnswerSuggestions";
import RescuePhrases from "./RescuePhrases";
import SpeakingMicDock from "./SpeakingMicDock";

function AiToolbar({
  chatLoading,
  viLoading,
  onListenAgain,
  onSpeakSlow,
  onTranslate,
  onHint,
  onEasierSpeak,
}) {
  return (
    <>
      <button type="button" className="mock-toolbar-btn" onClick={onListenAgain} disabled={chatLoading}>
        🔊 Nghe lại
      </button>
      <button type="button" className="mock-toolbar-btn" onClick={onSpeakSlow} disabled={chatLoading}>
        🐢 Nói chậm
      </button>
      <button type="button" className="mock-toolbar-btn" onClick={onTranslate} disabled={chatLoading || viLoading}>
        {viLoading ? "…" : "🇻🇳 Dịch nghĩa"}
      </button>
      <button type="button" className="mock-toolbar-btn" onClick={onHint} disabled={chatLoading}>
        💡 Gợi ý trả lời
      </button>
      <button type="button" className="mock-toolbar-btn" onClick={onEasierSpeak} disabled={chatLoading}>
        ✨ Nói dễ hơn
      </button>
    </>
  );
}

export default function SpeakingRoom({
  topSlot = null,
  sessionMode = "scenario",
  onSessionModeChange,
  quickSecsLeft = null,
  teacherName = "AI Teacher",
  teacherEmoji = "🦊",
  messages = [],
  listRef,
  chatLoading,
  recording,
  recordSecs = 0,
  voiceNotice,
  speechSupported,
  viByMessageId = {},
  hasActiveAssistant = false,
  viLoading = false,
  suggestions = [],
  onSuggestionPick,
  onListenAgain,
  onSpeakSlow,
  onTranslate,
  onHint,
  onEasierSpeak,
  onRescuePhrase,
  onSpeakMessage,
  onMic,
  onContinue,
  onEndSession,
  chatInput,
  onChatInput,
  onSendText,
  inputDisabled,
}) {
  const showScenarioSlot = sessionMode === "scenario" && topSlot;

  const toolbar = hasActiveAssistant ? (
    <AiToolbar
      chatLoading={chatLoading}
      viLoading={viLoading}
      onListenAgain={onListenAgain}
      onSpeakSlow={onSpeakSlow}
      onTranslate={onTranslate}
      onHint={onHint}
      onEasierSpeak={onEasierSpeak}
    />
  ) : null;

  return (
    <section className="speaking-room speaking-room--mockup" aria-label="Conversation Room">
      <SpeakingModeBar
        sessionMode={sessionMode}
        onModeChange={onSessionModeChange}
        quickSecsLeft={quickSecsLeft}
        disabled={inputDisabled && !recording}
      />

      {showScenarioSlot ? topSlot : null}

      {sessionMode === "quick_5" && quickSecsLeft === 0 ? (
        <p className="speaking-quick-done" role="status">
          ⏱️ Hết 5 phút! Xem phản hồi bên phải và bấm Tiếp tục.
        </p>
      ) : null}

      <ConversationThread
            messages={messages}
            teacherName={teacherName}
            teacherEmoji={teacherEmoji}
            listRef={listRef}
            chatLoading={chatLoading}
            showViById={viByMessageId}
            onSpeakMessage={onSpeakMessage}
            showToolbar={hasActiveAssistant}
            toolbarSlot={toolbar}
          />

          <div className="speaking-mic-stage">
            <AnswerSuggestions
              suggestions={suggestions}
              onPick={onSuggestionPick}
              disabled={inputDisabled}
            />
            <SpeakingMicDock
              recording={recording}
              recordSecs={recordSecs}
              speechSupported={speechSupported}
              voiceNotice={voiceNotice}
              onMic={onMic}
              inputDisabled={inputDisabled}
            />
            <RescuePhrases onPick={onRescuePhrase} disabled={inputDisabled} />
          </div>

          <div className="speaking-room-footer">
            <button
              type="button"
              className="speaking-room-footer__end"
              onClick={onEndSession}
              disabled={inputDisabled && !recording}
            >
              Kết thúc hội thoại
            </button>
            <button
              type="button"
              className="speaking-room-footer__continue"
              onClick={onContinue}
              disabled={chatLoading || recording}
            >
              Tiếp tục câu tiếp theo →
            </button>
          </div>

          <div className="speaking-text-input speaking-text-input--mockup">
            <input
              value={chatInput}
              onChange={(e) => onChatInput(e.target.value)}
              placeholder="Hoặc gõ tiếng Anh…"
              onKeyDown={(e) => {
                if (e.key === "Enter") onSendText();
              }}
              disabled={inputDisabled}
            />
            <button type="button" onClick={onSendText} disabled={inputDisabled}>
              Gửi
            </button>
          </div>
    </section>
  );
}
