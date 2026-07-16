"use client";

import { useEffect, useRef } from "react";

const ADSTERRA_SCRIPT = "https://pl30312723.effectivecpmnetwork.com/a6650256f1d4f5351405a4ccde4a4611/invoke.js";
const ADSTERRA_ID = "container-a6650256f1d4f5351405a4ccde4a4611";

export function AdsterraBanner({ height = 250, width = 300 }) {
  const banner = useRef(null);

  useEffect(() => {
    if (banner.current && !banner.current.firstChild) {
      const script = document.createElement("script");
      script.async = true;
      script.dataset.cfasync = "false";
      script.src = ADSTERRA_SCRIPT;
      const container = document.createElement("div");
      container.id = ADSTERRA_ID;
      banner.current.append(container);
      banner.current.append(script);
    }
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
        <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Sponsored</span>
      </div>
      <div className="p-3 flex justify-center" ref={banner} />
    </div>
  );
}

// Monetag disabled
export function MonetagInPagePush() {
  return null;
}
