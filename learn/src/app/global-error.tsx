"use client";
import { tr } from "@/lib/i18n/tr";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="uz">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f5f6f3", color: "#121a15" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 22 }}>{tr("Ilovada xatolik yuz berdi")}</h1>
          <p style={{ color: "#66726b" }}>{tr("Sahifani yangilab ko‘ring.")}</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 12, border: 0, background: "#0f7a5a", color: "#fff", fontSize: 15 }}>
            {tr("Qayta urinish")}
          </button>
        </div>
      </body>
    </html>
  );
}
