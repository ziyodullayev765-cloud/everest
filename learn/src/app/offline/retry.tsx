"use client";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tr } from "@/lib/i18n/tr";

export function RetryButton() {
  return (
    <Button className="mt-6" onClick={() => location.reload()}>
      <RefreshCw /> {tr("Qayta urinish")}
    </Button>
  );
}
