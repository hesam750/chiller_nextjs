import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const html =
    `<!doctype html>
    <html lang="fa" dir="rtl">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>آفلاین</title>
        <style>
          body{margin:0;min-height:100vh;background:#020617;color:#e2e8f0;font-family:ui-sans-serif,system-ui}
          .wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
          .card{max-width:460px;width:100%;border-radius:16px;border:1px solid rgba(56,189,248,.25);background:rgba(2,6,23,.8);backdrop-filter:blur(16px);padding:20px;box-shadow:0 20px 60px rgba(2,6,23,.8)}
          .title{font-size:18px;font-weight:700;margin-bottom:8px}
          .desc{font-size:14px;opacity:.8}
          .btns{display:flex;gap:8px;margin-top:14px}
          .btn{border-radius:12px;padding:10px 14px;font-size:13px;font-weight:600}
          .primary{background:linear-gradient(45deg,#38bdf8,#0ea5e9);color:#fff;border:none}
          .secondary{background:#0b1220;color:#e2e8f0;border:1px solid #334155}
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <div class="title">اتصال اینترنت قطع است</div>
            <div class="desc">برای ادامه استفاده، اتصال شبکه را برقرار کنید. برخی صفحات اخیراً بازدیدشده در حالت آفلاین در دسترس هستند.</div>
            <div class="btns">
              <button class="btn primary" onclick="location.reload()">تلاش مجدد</button>
              <button class="btn secondary" onclick="location.href='/'">صفحه اصلی</button>
            </div>
          </div>
        </div>
      </body>
    </html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
