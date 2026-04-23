"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiMode, setApiMode, type ApiMode } from "@/utils/apiConfig";
import { useAuth } from "@/contexts/AuthContext";

export default function ServerSwitch() {
  const [mode, setMode] = useState<ApiMode>("prod");
  const [pendingMode, setPendingMode] = useState<ApiMode | null>(null);
  const { setIsLoggedIn } = useAuth();
  const router = useRouter();

  const refresh = () => setMode(getApiMode());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("api-mode-change", handler);
    return () => window.removeEventListener("api-mode-change", handler);
  }, []);

  const toggle = () => {
    const next: ApiMode = mode === "prod" ? "dev" : "prod";
    setPendingMode(next);
  };

  const confirm = () => {
    if (!pendingMode) return;
    setApiMode(pendingMode);
    setMode(pendingMode);
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setPendingMode(null);
    router.push("/signin");
  };

  const cancel = () => {
    setPendingMode(null);
  };

  return (
    <>
      <button
        onClick={toggle}
        className={`
          px-3 py-1.5 rounded text-sm font-medium transition-colors
          ${mode === "dev"
            ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }
        `}
        title={mode === "dev" ? "Dev 서버 접속 중 (클릭하여 Prod로 전환)" : "Prod 서버 접속 중 (클릭하여 Dev로 전환)"}
      >
        {mode === "dev" ? "Dev 서버" : "Prod 서버"}
      </button>

      {pendingMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4">
            <p className="text-sm text-gray-700 text-center leading-relaxed">
              <span className="font-semibold">{pendingMode === "dev" ? "Dev" : "Prod"} 서버</span>로 전환됩니다.<br />
              로그아웃 후 다시 로그인해주세요.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancel}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                되돌아가기
              </button>
              <button
                onClick={confirm}
                className="flex-1 py-2 rounded-lg bg-gray-800 text-sm text-white hover:bg-gray-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
