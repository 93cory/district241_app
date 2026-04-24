"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  /** Texte complet a lire (sera decoupe en phrases naturelles) */
  text: string;
  /** Label optionnel du bouton (defaut : "Ecouter le briefing") */
  label?: string;
  /** Compact : icone seule sans texte (pour nav par exemple) */
  compact?: boolean;
}

/**
 * Briefing audio via l'API Web Speech (SpeechSynthesis).
 * Aucun cout serveur : synthese realisee dans le navigateur avec la voix
 * francaise installee localement (fr-FR si disponible).
 */
export function BriefingAudio({ text, label = "Ecouter le briefing", compact = false }: Props) {
  const [state, setState] = useState<"idle" | "playing" | "paused" | "unsupported">("idle");
  const [rate, setRate] = useState(1);
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setState("unsupported");
      return;
    }

    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      const frVoices = all.filter((v) => v.lang.toLowerCase().startsWith("fr"));
      setVoices(frVoices.length ? frVoices : all);
      // Preferer une voix fr-FR
      if (!voiceURI && frVoices.length) {
        const frFR = frVoices.find((v) => v.lang === "fr-FR") ?? frVoices[0];
        setVoiceURI(frFR.voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [voiceURI]);

  const play = () => {
    if (state === "unsupported" || !text.trim()) return;

    // Reset avant de re-lancer
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;

    const chosen = voices.find((v) => v.voiceURI === voiceURI);
    if (chosen) u.voice = chosen;

    u.onstart = () => setState("playing");
    u.onpause = () => setState("paused");
    u.onresume = () => setState("playing");
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");

    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  };

  const pause = () => {
    if (state === "playing") {
      window.speechSynthesis.pause();
      setState("paused");
    } else if (state === "paused") {
      window.speechSynthesis.resume();
      setState("playing");
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setState("idle");
  };

  if (state === "unsupported") return null;

  if (compact) {
    return (
      <button
        type="button"
        className="briefing-audio-compact"
        onClick={state === "idle" ? play : stop}
        aria-label={state === "idle" ? label : "Arreter la lecture"}
        title={state === "idle" ? label : "Arreter la lecture"}
      >
        {state === "idle" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <div className="briefing-audio">
      <div className="briefing-audio-controls">
        {state === "idle" ? (
          <button type="button" className="btn-primary briefing-audio-play" onClick={play}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            {label}
          </button>
        ) : (
          <>
            <button type="button" className="btn-secondary" onClick={pause}>
              {state === "playing" ? "Pause" : "Reprendre"}
            </button>
            <button type="button" className="btn-secondary" onClick={stop}>
              Arreter
            </button>
            {state === "playing" && (
              <span className="briefing-audio-live" aria-live="polite">
                <span className="briefing-audio-wave" aria-hidden="true">
                  <span /><span /><span /><span />
                </span>
                Lecture en cours
              </span>
            )}
          </>
        )}
      </div>

      <div className="briefing-audio-settings">
        <label className="briefing-audio-setting">
          <span>Voix</span>
          <select
            className="pnpi-form-select"
            value={voiceURI}
            onChange={(e) => setVoiceURI(e.target.value)}
            aria-label="Choix de la voix"
          >
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>

        <label className="briefing-audio-setting">
          <span>Vitesse : {rate.toFixed(1)}x</span>
          <input
            type="range"
            min={0.7}
            max={1.5}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            aria-label="Vitesse de lecture"
          />
        </label>
      </div>
    </div>
  );
}
