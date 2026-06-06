"use client";

import { useCallback, useRef, useState } from "react";
import { startPatientSpeechRecognition } from "@/lib/browser-patient-speech";
import { evaluatePronunciation } from "@/lib/client-pronunciation-eval";

export function useVocabularySpeech() {
  const [recordingId, setRecordingId] = useState(null);
  const [speechResult, setSpeechResult] = useState({});
  const recognitionRef = useRef(null);
  const azureTokenRef = useRef(null);

  const getAzureToken = useCallback(async () => {
    const cached = azureTokenRef.current;
    if (cached && Date.now() - cached.createdAt < 9 * 60 * 1000) return cached;
    const res = await fetch("/api/pronunciation/token", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json?.success || !json?.data?.token || !json?.data?.region) return null;
    const next = {
      token: String(json.data.token),
      region: String(json.data.region),
      createdAt: Date.now(),
    };
    azureTokenRef.current = next;
    return next;
  }, []);

  const recognizeWithAzure = useCallback(
    async (target, isSentence) => {
      const auth = await getAzureToken();
      if (!auth) return null;
      const sdk = await import("microsoft-cognitiveservices-speech-sdk");
      const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(auth.token, auth.region);
      speechConfig.speechRecognitionLanguage = "en-US";
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      const paConfig = new sdk.PronunciationAssessmentConfig(
        String(target || ""),
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Phoneme,
        true
      );
      paConfig.enableProsodyAssessment = Boolean(isSentence);
      paConfig.applyTo(recognizer);

      return new Promise((resolve, reject) => {
        recognizer.recognizeOnceAsync(
          (result) => {
            try {
              if (result.reason !== sdk.ResultReason.RecognizedSpeech) {
                recognizer.close();
                resolve(null);
                return;
              }
              const pa = sdk.PronunciationAssessmentResult.fromResult(result);
              const score = Math.max(0, Math.round(Number(pa?.pronunciationScore || 0)));
              const transcript = String(result?.text || "").trim();
              const local = evaluatePronunciation(transcript, target, { isSentence });
              recognizer.close();
              resolve({
                score,
                transcript,
                message: local.message,
                details: local.details,
              });
            } catch (error) {
              recognizer.close();
              reject(error);
            }
          },
          (error) => {
            recognizer.close();
            reject(error);
          }
        );
      });
    },
    [getAzureToken]
  );

  const startRecord = useCallback(
    async (item, { sentence = false } = {}) => {
      const key = sentence ? `sentence-${item.id}` : item.id;
      const target = sentence ? item.example_sentence || "" : item.word || "";

      recognitionRef.current?.abort?.();
      setRecordingId(key);

      try {
        const cloud = await recognizeWithAzure(target, sentence);
        if (cloud) {
          setSpeechResult((prev) => ({ ...prev, [key]: cloud }));
          setRecordingId(null);
          return;
        }
      } catch (_error) {}

      const ctrl = startPatientSpeechRecognition({
        lang: "en-US",
        silenceMs: sentence ? 3200 : 2800,
        maxMs: sentence ? 32000 : 28000,
        onDone: (transcript) => {
          const evaluation = evaluatePronunciation(transcript, target, {
            isSentence: sentence,
            expectedIpaText: sentence ? item.example_sentence_ipa || "" : item.ipa || "",
          });
          setSpeechResult((prev) => ({
            ...prev,
            [key]: { ...evaluation, transcript },
          }));
          setRecordingId(null);
          recognitionRef.current = null;
        },
        onError: () => {
          setSpeechResult((prev) => ({
            ...prev,
            [key]: {
              score: 0,
              transcript: "",
              message: "Lỗi ghi âm. Hãy cấp quyền microphone.",
            },
          }));
          setRecordingId(null);
          recognitionRef.current = null;
        },
      });

      if (!ctrl) {
        setSpeechResult((prev) => ({
          ...prev,
          [key]: {
            score: 0,
            transcript: "",
            message: "Trình duyệt không hỗ trợ ghi âm.",
          },
        }));
        setRecordingId(null);
        return;
      }
      recognitionRef.current = ctrl;
    },
    [recognizeWithAzure]
  );

  return { recordingId, speechResult, startRecord };
}
