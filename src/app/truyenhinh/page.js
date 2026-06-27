"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { CHANNELS } from "../channels";

const TruyenhinhContent = dynamic(() => import("./TruyenhinhContent"), {
  ssr: false,
});

export default function Page() {
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(null);

  useEffect(() => {
    const unlocked = localStorage.getItem("truyenhinh_code_unlocked") === "true";
    setIsUnlocked(unlocked);
    if (unlocked && CHANNELS[0]) {
      router.replace(`/truyenhinh/${CHANNELS[0].id}`);
    }
  }, [router]);

  if (isUnlocked === null || (isUnlocked === true && CHANNELS[0])) {
    return <div className="flex-1 bg-[#08080a]" />;
  }

  return (
    <Suspense fallback={<div className="flex-1 bg-[#08080a]" />}>
      <TruyenhinhContent />
    </Suspense>
  );
}
