"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const TruyenhinhContent = dynamic(() => import("./TruyenhinhContent"), {
  ssr: false,
});

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-[#08080a] text-white">
          <div className="text-lg font-semibold animate-pulse">Đang tải trình phát...</div>
        </div>
      }
    >
      <TruyenhinhContent />
    </Suspense>
  );
}
