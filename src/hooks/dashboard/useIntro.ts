import { useState, useEffect } from "react";

export function useIntro() {
  const [introOpen, setIntroOpen] = useState(true);

  useEffect(() => {
    if (!introOpen) return;
    const id = setTimeout(() => setIntroOpen(false), 6000);
    return () => clearTimeout(id);
  }, [introOpen]);

  return { introOpen, setIntroOpen };
}
