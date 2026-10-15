"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="uz">
      <body
        style={{
          background: "#050506",
          color: "#f5f5f4",
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600 }}>Nimadir xato ketdi</h1>
          <p style={{ color: "#a1a1aa" }}>Kutilmagan xatolik yuz berdi.</p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "12px 22px",
              borderRadius: 999,
              border: 0,
              background: "#10b981",
              color: "#000",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}
