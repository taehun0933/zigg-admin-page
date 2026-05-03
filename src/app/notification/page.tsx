"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/NavigationBar";
import { navigationItems } from "@/utils/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { broadcastNotification } from "@/apis/notification";
import { getApiMode } from "@/utils/apiConfig";

export default function AdminNotificationBroadcastPage() {
  const router = useRouter();
  const { isLoggedIn, setIsLoggedIn } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [serverMode, setServerMode] = useState<"prod" | "dev">("prod");

  useEffect(() => {
    setMounted(true);
    setServerMode(getApiMode());
    const handler = () => setServerMode(getApiMode());
    window.addEventListener("api-mode-change", handler);
    return () => window.removeEventListener("api-mode-change", handler);
  }, []);

  const navItems = navigationItems(router, () => {
    setIsLoggedIn(false);
    router.push("/signin");
  });

  useEffect(() => {
    if (!mounted) return;
    if (!isLoggedIn) router.replace("/signin");
  }, [mounted, isLoggedIn, router]);

  if (!mounted) return <div className="min-h-screen bg-gray-50" />;
  if (!isLoggedIn) return null;

  const isProd = serverMode === "prod";
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const canSubmit = trimmedTitle.length > 0 && trimmedBody.length > 0 && !submitting;

  const openConfirm = () => {
    setError(null);
    setSuccess(false);
    if (!canSubmit) return;
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await broadcastNotification({ title: trimmedTitle, body: trimmedBody });
      setSuccess(true);
      setTitle("");
      setBody("");
      setConfirmOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "발송 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation items={navItems} />

      <main className="max-w-3xl mx-auto p-4 pt-12">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">알림 발송</h1>
            <p className="text-gray-600 mt-2">
              전체 유저에게 푸시 알림과 인앱 알림을 동시에 발송합니다.
            </p>
            <div
              className={`mt-3 inline-block px-3 py-1 rounded-md text-xs font-medium ${
                isProd
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isProd ? "Prod 서버" : "Dev 서버"}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">제목</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="알림 제목"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400 self-end">
                {title.length}/100
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">본문</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={300}
                rows={6}
                placeholder="알림 본문"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <span className="text-xs text-gray-400 self-end">
                {body.length}/300
              </span>
            </label>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                전체 유저에게 발송 요청을 보냈습니다.
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={openConfirm}
                disabled={!canSubmit}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                전체 발송
              </button>
            </div>
          </div>
        </div>
      </main>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-800">
              전체 유저에게 발송하시겠습니까?
            </h2>
            <div
              className={`text-xs font-medium ${
                isProd ? "text-red-700" : "text-amber-800"
              }`}
            >
              현재 환경: {isProd ? "Prod 서버" : "Dev 서버"}
            </div>
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="text-xs text-gray-500 mb-1">제목</div>
              <div className="text-sm text-gray-800 font-medium mb-3">
                {trimmedTitle}
              </div>
              <div className="text-xs text-gray-500 mb-1">본문</div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                {trimmedBody}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                되돌아가기
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className={`flex-1 py-2 rounded-lg text-sm text-white transition-colors ${
                  isProd
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                } disabled:opacity-50`}
              >
                {submitting ? "발송 중..." : "발송"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
