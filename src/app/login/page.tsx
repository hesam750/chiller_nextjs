"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import fanapLogo from "../../../fanap.png";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("ورود نامعتبر");
        return;
      }
      const data = await res.json();
      if (data.role === "admin" || data.role === "manager") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#0e1426] to-[#0a0f1a] text-slate-50 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative w-[min(55vw,560px)] h-[min(55vw,560px)] rounded-full bg-[radial-gradient(circle_at_50%_50%,#0c1220_0%,#08101a_60%,#050a14_100%)] border border-blue-500/10 shadow-[inset_0_0_20px_rgba(0,0,0,.8),0_8px_32px_rgba(0,0,0,.5),0_0_60px_rgba(59,130,246,.05)] flex items-center justify-center">
          <svg
            viewBox="0 0 120 120"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[calc(100%-16px)] h-[calc(100%-16px)] drop-shadow-[0_0_8px_rgba(59,130,246,0.2)]"
          >
            <defs>
              <linearGradient id="bladeMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#cfd5db" />
                <stop offset="40%" stopColor="#9aa2aa" />
                <stop offset="60%" stopColor="#858c94" />
                <stop offset="100%" stopColor="#d6dbe0" />
              </linearGradient>
              <radialGradient id="hubMetal" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#e7eaee" />
                <stop offset="65%" stopColor="#c2c7ce" />
                <stop offset="100%" stopColor="#9ba2aa" />
              </radialGradient>
              <linearGradient id="shroudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#757c84" />
                <stop offset="100%" stopColor="#444a50" />
              </linearGradient>
              <clipPath id="fanClip">
                <circle cx="60" cy="60" r="52" />
              </clipPath>
            </defs>
            <circle
              cx="60"
              cy="60"
              r="56"
              fill="url(#shroudGrad)"
              stroke="#2f3337"
              strokeWidth="4"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#1f2327"
              strokeWidth="1"
              opacity="0.6"
            />
            <g className="origin-center animate-[spin_8s_linear_infinite]" clipPath="url(#fanClip)">
              <g transform="translate(60,60)">
                <g transform="scale(0.80)">
                  <g id="blade6" fill="url(#bladeMetal)">
                    <path d="M 2 -18 C 8 -30, 22 -40, 34 -42 C 45 -44, 50 -42, 52 -38 C 54 -33, 49 -27, 42 -24 C 33 -20, 22 -15, 14 -9 C 6 -3, 0 4, -2 10 C -4 15, -6 18, -10 18 C -14 18, -16 14, -16 10 C -16 2, -10 -8, 2 -18 Z" />
                  </g>
                  <use href="#blade6" transform="rotate(0)" />
                  <use href="#blade6" transform="rotate(60)" />
                  <use href="#blade6" transform="rotate(120)" />
                  <use href="#blade6" transform="rotate(180)" />
                  <use href="#blade6" transform="rotate(240)" />
                  <use href="#blade6" transform="rotate(300)" />
                </g>
              </g>
            </g>
            <circle
              cx="60"
              cy="60"
              r="12"
              fill="url(#hubMetal)"
              stroke="#3b4147"
              strokeWidth="0.9"
            />
            <circle cx="60" cy="60" r="4" fill="#343a40" />
          </svg>
          <div className="absolute inset-0 rounded-full opacity-25 pointer-events-none bg-[repeating-radial-gradient(circle_at_50%_50%,rgba(255,255,255,.08)_0_1px,transparent_1px_8px)]" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-blue-500/20 bg-slate-900/80 px-8 py-10 shadow-[0_25px_80px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-slate-900/60 px-3 py-2">
              <img src={fanapLogo.src} alt="Fanap Tech" className="h-7 w-auto" />
              <span className="text-sm font-semibold tracking-tight">Fanap Tech</span>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide">
                نام کاربری
              </label>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3 text-sm text-slate-50 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                placeholder="نام کاربری سازمانی"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide">
                رمز عبور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3 pl-12 text-sm text-slate-50 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  placeholder="رمز عبور خود را وارد کنید"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {error && (
              <div className="text-xs text-red-400 mt-1">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-gradient-to-tr from-blue-500 to-blue-600 px-4 py-3 text-sm font-semibold tracking-wide text-white shadow-[0_8px_24px_rgba(59,130,246,0.4)] transition hover:from-blue-600 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "در حال ورود..." : "ورود"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

