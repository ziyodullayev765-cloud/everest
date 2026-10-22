"use client";
import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { Switch } from "@/components/ui/form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { play, setSoundOn, soundOn } from "@/lib/sfx";

export function SoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(soundOn()), []);
  return (
    <Card>
      <CardHeader title="Ovoz" icon={<Volume2 />} />
      <CardBody className="pt-3">
        <Switch
          checked={on}
          onChange={(v) => {
            setSoundOn(v);
            setOn(v);
            if (v) play("correct");
          }}
          label="Ovoz effektlari"
          description="To‘g‘ri / noto‘g‘ri javob, o‘yin va yakunlash ovozlari. Shu qurilmada saqlanadi."
        />
      </CardBody>
    </Card>
  );
}
