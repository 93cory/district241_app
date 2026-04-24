"use client";

import { useEffect, useRef, useState } from "react";

// Le type SpeechRecognition n'est pas dans les types DOM standards.
// Declaration minimale pour eviter les erreurs de compilation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SR = any;

interface Props {
  /** Texte actuel du champ (controlled) */
  value: string;
  /** Handler pour mettre a jour le texte */
  onChange: (next: string) => void;
  /** Langue BCP-47 · defaut fr-FR */
  lang?: string;
  /** Label pour l'aria */
  ariaLabel?: string;
}

/**
 * Bouton microphone qui utilise l'API Web Speech Recognition
 * pour dicter dans un textarea (inspecteur terrain, mains prises).
 * Aucun cout serveur : reconnaissance dans le navigateur
 * (Chrome / Edge / Safari desktop). Si non supporte, bouton masque.
 */
export function VoiceInput({
  value,
  onChange,
  lang = "fr-FR",
  ariaLabel = "Dictee vocale",
}: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SR | null>(null);
  const baseValueRef = useRef<string>(value);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SR;
      webkitSpeechRecognition?: SR;
    };
    const SRClass = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SRClass) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const recog = new SRClass();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = lang;

    recog.onresult = (event: SR) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript + " ";
        else interimTranscript += transcript;
      }
      const prefix = baseValueRef.current
        ? baseValueRef.current + (baseValueRef.current.endsWith(" ") ? "" : " ")
        : "";
      onChange(prefix + finalTranscript + interimTranscript);
    };

    recog.onerror = (ev: SR) => {
      setError(ev?.error ?? "Erreur de reconnaissance.");
      setListening(false);
    };

    recog.onend = () => setListening(false);

    recognitionRef.current = recog;

    return () => {
      try {
        recog.stop();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const start = () => {
    if (!recognitionRef.current) return;
    setError(null);
    baseValueRef.current = value;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // Deja en cours : relance
      try {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current?.start(), 100);
      } catch {
        /* ignore */
      }
    }
  };

  const stop = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  };

  if (!supported) return null;

  return (
    <div className="voice-input">
      <button
        type="button"
        className={`voice-input-btn ${listening ? "is-listening" : ""}`}
        onClick={listening ? stop : start}
        aria-label={listening ? "Arreter la dictee" : ariaLabel}
        title={listening ? "Arreter la dictee" : "Dictee vocale (microphone)"}
      >
        {listening ? (
          <>
            <span className="voice-input-dot" aria-hidden="true" />
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="6" y="5" width="12" height="14" rx="2" />
            </svg>
            <span>Arreter</span>
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <span>Dicter</span>
          </>
        )}
      </button>
      {error && <span className="voice-input-error">{error}</span>}
    </div>
  );
}
