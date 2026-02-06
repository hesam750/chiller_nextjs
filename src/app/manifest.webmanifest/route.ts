import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const body = {
    name: "Chiller",
    short_name: "Chiller",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#0ea5e9",
    lang: "fa",
    dir: "rtl",
    scope: "/",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
  return new NextResponse(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
