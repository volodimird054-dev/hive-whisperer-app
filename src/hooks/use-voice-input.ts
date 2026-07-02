import { useCallback, useEffect, useRef, useState } from "react";

// Термінологія для пріоритетного розпізнавання (Chrome використовує SpeechGrammarList
// як підказку — не всі браузери підтримують, але не шкодить).
export const BEEKEEPER_TERMS = [
  "матка", "маточник", "маточники", "розплід", "рамка", "рамки",
  "корпус", "магазин", "нуклеус", "відводок", "рій", "ройовий",
  "підгодівля", "лікування", "бакфаст", "карніка", "українська степова",
  "мед", "точок", "вулик",
];

function getRecognition(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = "uk-UA";
  r.interimResults = true;
  r.continuous = true;
  try {
    const GL = w.SpeechGrammarList || w.webkitSpeechGrammarList;
    if (GL) {
      const grammar = `#JSGF V1.0; grammar bees; public <bee> = ${BEEKEEPER_TERMS.join(" | ")} ;`;
      const list = new GL();
      list.addFromString(grammar, 1);
      r.grammars = list;
    }
  } catch {}
  return r;
}

export type UseVoiceInputOptions = {
  // Автозупинка після паузи (мс). 0 — вимкнено.
  silenceMs?: number;
  onFinalCommit?: (text: string) => void;
};

// Керує Web Speech API без дублювання тексту:
// - фінальні результати накопичуються один раз;
// - interim показується окремо і не приєднується назавжди;
// - при рестарті сесії всі фінали вже збережені.
export function useVoiceInput(opts: UseVoiceInputOptions = {}) {
  const { silenceMs = 3500 } = opts;
  const [supported, setSupported] = useState<boolean>(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recRef = useRef<any>(null);
  const userStoppedRef = useRef(true);
  const committedRef = useRef("");
  const interimRef = useRef("");
  const silenceTimerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const clearSilence = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    userStoppedRef.current = true;
    clearSilence();
    try { recRef.current?.stop?.(); } catch {}
    setListening(false);
  }, []);

  const resetSilence = useCallback(() => {
    if (!silenceMs) return;
    clearSilence();
    silenceTimerRef.current = setTimeout(() => stop(), silenceMs);
  }, [silenceMs, stop]);

  const start = useCallback((initial = "") => {
    const r = getRecognition();
    if (!r) return false;
    recRef.current = r;
    userStoppedRef.current = false;
    committedRef.current = initial;
    interimRef.current = "";
    setTranscript(initial);
    setListening(true);

    r.onresult = (e: any) => {
      let addedFinal = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript;
        if (e.results[i].isFinal) addedFinal += seg;
        else interim += seg;
      }
      if (addedFinal) {
        const t = addedFinal.trim();
        committedRef.current = (committedRef.current ? committedRef.current + " " : "") + t;
      }
      interimRef.current = interim.trim();
      const combined = interimRef.current
        ? (committedRef.current ? committedRef.current + " " : "") + interimRef.current
        : committedRef.current;
      setTranscript(combined);
      resetSilence();
    };

    r.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setListening(false);
    };

    r.onend = () => {
      // При завершенні сесії комітимо interim, щоб не втратити останні слова.
      if (interimRef.current) {
        committedRef.current = (committedRef.current ? committedRef.current + " " : "") + interimRef.current;
        interimRef.current = "";
        setTranscript(committedRef.current);
      }
      if (!userStoppedRef.current) {
        try { r.start(); return; } catch {}
      }
      clearSilence();
      setListening(false);
      opts.onFinalCommit?.(committedRef.current);
    };

    try { r.start(); } catch {}
    resetSilence();
    return true;
  }, [opts, resetSilence]);

  useEffect(() => () => stop(), [stop]);

  return { supported, listening, transcript, setTranscript, start, stop };
}
