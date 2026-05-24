import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: "linear-gradient(145deg, #1c1917 0%, #292524 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 0 0 1.5px #d97706",
        }}
      >
        <span
          style={{
            color: "#f59e0b",
            fontSize: 22,
            fontWeight: 900,
            lineHeight: 1,
            marginTop: -1,
          }}
        >
          ?
        </span>
      </div>
    ),
    { width: 32, height: 32 }
  );
}
