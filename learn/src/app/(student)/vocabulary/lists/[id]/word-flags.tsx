"use client";
import { useEffect, useRef, useState } from "react";
import { Star, TriangleAlert, Volume2 } from "lucide-react";
import { wordFlagAction } from "@/app/actions/vocab";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { tr } from "@/lib/i18n/tr";

export function WordFlags({ wordId, audioFileId, english, favorite, difficult }: { wordId: string; audioFileId: string | null; english: string; favorite: boolean; difficult: boolean }) {
  const [fav, setFav] = useState(favorite);
  const [hard, setHard] = useState(difficult);
  const [tts, setTts] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => setTts("speechSynthesis" in window), []);
  const flag = async (f: "favorite" | "difficult", on: boolean) => {
    if (f === "favorite") setFav(on);
    else setHard(on);
    const r = await wordFlagAction(wordId, f, on);
    if (!r.ok) toast.error(r.error);
  };
  const play = () => {
    if (audioFileId) return void audio.current?.play();
    const u = new SpeechSynthesisUtterance(english);
    u.lang = "en-US";
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };
  return (
    <div className="flex shrink-0">
      {audioFileId ? <audio ref={audio} src={`/api/files/${audioFileId}`} preload="none" /> : null}
      {audioFileId || tts ? (
        <Button variant="ghost" size="icon" onClick={play} aria-label={audioFileId ? tr("Talaffuz") : tr("Talaffuz (brauzer ovozi)")}>
          <Volume2 />
        </Button>
      ) : null}
      <Button variant="ghost" size="icon" onClick={() => flag("difficult", !hard)} aria-pressed={hard} aria-label={tr("Qiyin so‘z")} className={hard ? "text-danger" : ""}>
        <TriangleAlert />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => flag("favorite", !fav)} aria-pressed={fav} aria-label={tr("Sevimli")} className={fav ? "text-warning" : ""}>
        <Star className={fav ? "fill-current" : ""} />
      </Button>
    </div>
  );
}
