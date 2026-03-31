import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Eryx: AI-powered system design and search assistant";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(to bottom right, #09090b, #18181b)",
          color: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
          border: "1px solid #27272a",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            background: "linear-gradient(to bottom right, #ffffff, #a3a3a3)",
            borderRadius: 20,
            marginBottom: 30,
            boxShadow: "0 0 40px rgba(255,255,255,0.1)",
          }}
        >
          {/* Mock Logo Mark */}
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#09090b" }} />
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: "-0.05em",
            marginBottom: 16,
            background: "linear-gradient(to bottom right, #ffffff, #a3a3a3)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Eryx
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#a1a1aa",
            fontWeight: 500,
            letterSpacing: "-0.02em",
          }}
        >
          AI System Design & Search Assistant for Developers
        </div>
      </div>
    ),
    { ...size }
  );
}
