import { useEffect, useRef } from "react";
import { Mic, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { toast } from "sonner";

// Textarea з маленькою кнопкою мікрофона.
// Голосовий текст ДОДАЄТЬСЯ до вже написаного, не замінює його.
export function VoiceTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const baseRef = useRef(value);
  const { supported, listening, transcript, start, stop } = useVoiceInput({ silenceMs: 3500 });

  useEffect(() => {
    if (!listening) return;
    const base = baseRef.current;
    const spoken = transcript.trim();
    if (!spoken) return;
    onChange(base ? `${base.trim()} ${spoken}` : spoken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, listening]);

  function handleMic() {
    if (listening) { stop(); return; }
    if (!supported) {
      toast.error("Браузер не підтримує голосовий ввід. Спробуйте Chrome на Android.");
      return;
    }
    baseRef.current = value;
    start();
  }

  return (
    <div className="relative">
      <Textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-12"
      />
      <Button
        type="button"
        size="icon"
        variant={listening ? "destructive" : "outline"}
        className="absolute right-1 top-1 h-9 w-9"
        onClick={handleMic}
        aria-label={listening ? "Зупинити запис" : "Голосовий ввід"}
      >
        {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </Button>
      {listening && (
        <div className="text-xs text-muted-foreground mt-1">
          Слухаю… автоматична зупинка через ~3 сек тиші.
        </div>
      )}
    </div>
  );
}
