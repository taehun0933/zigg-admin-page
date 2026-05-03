"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/NavigationBar";
import { navigationItems } from "@/utils/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  broadcastNotification,
  sendAuditionNotification,
} from "@/apis/notification";
import { getAuditions } from "@/apis/audition";
import { getApiMode } from "@/utils/apiConfig";

type NotificationMode = "general" | "audition";

interface AuditionOption {
  id: number;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
}

export default function AdminNotificationBroadcastPage() {
  const router = useRouter();
  const { isLoggedIn, setIsLoggedIn } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [serverMode, setServerMode] = useState<"prod" | "dev">("prod");

  const [mode, setMode] = useState<NotificationMode>("general");

  // 공통 입력 (mode 별로 분리 유지하면 탭 전환 시 의도치 않은 섞임 방지)
  const [generalTitle, setGeneralTitle] = useState("");
  const [generalBody, setGeneralBody] = useState("");

  const [auditions, setAuditions] = useState<AuditionOption[]>([]);
  const [auditionsLoading, setAuditionsLoading] = useState(false);
  const [selectedAuditionId, setSelectedAuditionId] = useState<number | null>(null);
  const [auditionTitle, setAuditionTitle] = useState("");
  const [auditionBody, setAuditionBody] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  useEffect(() => {
    if (!mounted || !isLoggedIn) return;
    let cancelled = false;
    setAuditionsLoading(true);
    getAuditions()
      .then((list: AuditionOption[] | undefined) => {
        if (!cancelled) setAuditions(list ?? []);
      })
      .catch(() => {
        if (!cancelled) setAuditions([]);
      })
      .finally(() => {
        if (!cancelled) setAuditionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, isLoggedIn]);

  if (!mounted) return <div className="min-h-screen bg-gray-50" />;
  if (!isLoggedIn) return null;

  const isProd = serverMode === "prod";

  const trimmedGeneralTitle = generalTitle.trim();
  const trimmedGeneralBody = generalBody.trim();
  const trimmedAuditionTitle = auditionTitle.trim();
  const trimmedAuditionBody = auditionBody.trim();
  const selectedAudition = auditions.find((a) => a.id === selectedAuditionId);

  const canSubmitGeneral =
    trimmedGeneralTitle.length > 0 && trimmedGeneralBody.length > 0;
  const canSubmitAudition =
    selectedAuditionId !== null &&
    trimmedAuditionTitle.length > 0 &&
    trimmedAuditionBody.length > 0;

  const canSubmit =
    (mode === "general" ? canSubmitGeneral : canSubmitAudition) && !submitting;

  const switchMode = (next: NotificationMode) => {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setSuccess(false);
  };

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
      if (mode === "general") {
        await broadcastNotification({
          title: trimmedGeneralTitle,
          body: trimmedGeneralBody,
        });
        setGeneralTitle("");
        setGeneralBody("");
      } else if (mode === "audition" && selectedAuditionId !== null) {
        await sendAuditionNotification(selectedAuditionId, {
          title: trimmedAuditionTitle,
          body: trimmedAuditionBody,
        });
        setAuditionTitle("");
        setAuditionBody("");
        // 오디션 선택은 유지 (다른 알림 추가 발송 편의)
      }
      setSuccess(true);
      setConfirmOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "발송 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const previewTitle =
    mode === "general" ? trimmedGeneralTitle : trimmedAuditionTitle;
  const previewBody =
    mode === "general" ? trimmedGeneralBody : trimmedAuditionBody;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation items={navItems} />

      <main className="max-w-3xl mx-auto p-4 pt-12">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* 헤더 */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">알림 발송</h1>
              <p className="text-gray-600 mt-2">
                전체 유저에게 푸시 알림과 인앱 알림을 동시에 발송합니다.
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-md text-xs font-medium ${
                isProd
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isProd ? "Prod 서버" : "Dev 서버"}
            </div>
          </div>

          {/* 타입 세그먼트 컨트롤 */}
          <div className="inline-flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => switchMode("general")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "general"
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              일반 알림
            </button>
            <button
              onClick={() => switchMode("audition")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "audition"
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              오디션 알림
            </button>
          </div>

          {/* 폼 */}
          <div className="flex flex-col gap-4">
            {mode === "audition" && (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">
                  오디션 선택
                </span>
                <select
                  value={selectedAuditionId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    setSelectedAuditionId(id);
                    const picked = auditions.find((a) => a.id === id);
                    if (picked && auditionTitle.trim().length === 0) {
                      setAuditionTitle(picked.title);
                    }
                  }}
                  disabled={auditionsLoading}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">
                    {auditionsLoading
                      ? "오디션 로딩 중..."
                      : auditions.length === 0
                      ? "오디션이 없습니다"
                      : "오디션을 선택하세요"}
                  </option>
                  {auditions.map((a) => (
                    <option key={a.id} value={a.id}>
                      [#{a.id}] {a.title} — {a.company} ({a.startDate} ~{" "}
                      {a.endDate})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">제목</span>
              <input
                type="text"
                value={mode === "general" ? generalTitle : auditionTitle}
                onChange={(e) =>
                  mode === "general"
                    ? setGeneralTitle(e.target.value)
                    : setAuditionTitle(e.target.value)
                }
                maxLength={100}
                placeholder={
                  mode === "audition"
                    ? "오디션 선택 시 자동 prefill, 수정 가능"
                    : "알림 제목"
                }
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400 self-end">
                {(mode === "general" ? generalTitle : auditionTitle).length}/100
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">본문</span>
              <textarea
                value={mode === "general" ? generalBody : auditionBody}
                onChange={(e) =>
                  mode === "general"
                    ? setGeneralBody(e.target.value)
                    : setAuditionBody(e.target.value)
                }
                maxLength={300}
                rows={6}
                placeholder="알림 본문"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <span className="text-xs text-gray-400 self-end">
                {(mode === "general" ? generalBody : auditionBody).length}/300
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

            <div className="flex justify-end pt-2">
              <button
                onClick={openConfirm}
                disabled={!canSubmit}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {mode === "general" ? "전체 발송" : "오디션 알림 발송"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-96 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {mode === "general"
                ? "전체 유저에게 발송하시겠습니까?"
                : "오디션 알림을 전체 유저에게 발송하시겠습니까?"}
            </h2>
            <div
              className={`text-xs font-medium ${
                isProd ? "text-red-700" : "text-amber-800"
              }`}
            >
              현재 환경: {isProd ? "Prod 서버" : "Dev 서버"}
            </div>
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-sm">
              {mode === "audition" && selectedAudition && (
                <>
                  <div className="text-xs text-gray-500 mb-1">오디션</div>
                  <div className="text-gray-800 font-medium">
                    #{selectedAudition.id} {selectedAudition.title}
                  </div>
                  <div className="text-gray-600 text-xs mt-1 mb-3">
                    {selectedAudition.company} · {selectedAudition.startDate} ~{" "}
                    {selectedAudition.endDate}
                  </div>
                </>
              )}
              <div className="text-xs text-gray-500 mb-1">제목</div>
              <div className="text-sm text-gray-800 font-medium mb-3">
                {previewTitle}
              </div>
              <div className="text-xs text-gray-500 mb-1">본문</div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                {previewBody}
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
