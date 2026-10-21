"use client";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryButton() {
  return (
    <Button className="mt-6" onClick={() => location.reload()}>
      <RefreshCw /> Qayta urinish
    </Button>
  );
}
