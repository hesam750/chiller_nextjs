 "use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaClient() {
 const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
       navigator.serviceWorker
         .register("/sw.js")
        .then((reg) => {
          if (reg && reg.waiting) {
            reg.waiting.postMessage("SKIP_WAITING");
          }
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            location.reload();
          });
          reg.addEventListener("updatefound", () => {
            const sw = reg.installing || reg.waiting;
            if (sw) {
              sw.addEventListener("statechange", () => {
                if (sw.state === "installed" && reg.waiting) {
                  reg.waiting.postMessage("SKIP_WAITING");
                }
              });
            }
          });
        })
        .catch(() => undefined);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    const e = deferred;
    setVisible(false);
    setDeferred(null);
    await e.prompt();
    const choice = await e.userChoice;
    const outcome = choice && choice.outcome;
    if (outcome !== "accepted") {
      setTimeout(() => setVisible(false), 100);
    }
  };
 
   const close = () => setVisible(false);
 
   if (!visible) return null;
 
   return (
     <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md">
       <div className="m-3 rounded-2xl border border-sky-400/30 bg-slate-900/80 backdrop-blur-xl shadow-2xl p-4 text-slate-100">
         <div className="flex items-center justify-between gap-3">
           <div className="flex flex-col">
             <span className="text-sm font-semibold">نصب نسخه موبایل</span>
             <span className="text-xs text-slate-400">برای دسترسی سریع روی صفحه اصلی نصب کن</span>
           </div>
           <div className="flex items-center gap-2">
             <button
               onClick={install}
               className="rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(14,165,233,0.35)]"
             >
               نصب
             </button>
             <button
               onClick={close}
               className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs"
             >
               بستن
             </button>
           </div>
         </div>
       </div>
     </div>
   );
 }
