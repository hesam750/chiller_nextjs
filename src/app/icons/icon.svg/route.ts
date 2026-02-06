import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#38bdf8"/>
          <stop offset="1" stop-color="#0ea5e9"/>
        </linearGradient>
        <radialGradient id="g2" cx="128" cy="128" r="128">
          <stop offset="0" stop-color="#94a3b8"/>
          <stop offset="0.7" stop-color="#64748b"/>
          <stop offset="1" stop-color="#1f2937"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="256" height="256" rx="48" fill="url(#g2)"/>
      <circle cx="128" cy="128" r="92" fill="none" stroke="#0f172a" stroke-width="8"/>
      <g transform="translate(128,128)">
        <g transform="scale(1)">
          <g id="b" fill="url(#g1)">
            <path d="M8 -48 C 24 -78, 66 -104, 92 -108 C 116 -112, 126 -106, 132 -92 C 138 -77, 122 -58, 100 -48 C 78 -36, 50 -22, 30 -6 C 10 8, -6 26, -12 40 C -18 52, -24 58, -36 58 C -48 58, -54 48, -54 38 C -54 14, -34 -16, 8 -48 Z"/>
          </g>
          <use href="#b" transform="rotate(60)"/>
          <use href="#b" transform="rotate(120)"/>
          <use href="#b" transform="rotate(180)"/>
          <use href="#b" transform="rotate(240)"/>
          <use href="#b" transform="rotate(300)"/>
        </g>
      </g>
      <circle cx="128" cy="128" r="22" fill="#0b1220" stroke="#38bdf8" stroke-width="3"/>
      <circle cx="128" cy="128" r="6" fill="#0ea5e9"/>
    </svg>`;
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=604800",
    },
  });
}
