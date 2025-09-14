"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/NavigationBar";
import { navigationItems } from "@/utils/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminNoticeBanners, AdminNoticeBanner } from "@/apis/notice";

export default function AdminNoticeGridPage() {
  const router = useRouter();
  const { isLoggedIn, setIsLoggedIn } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [banners, setBanners] = useState<AdminNoticeBanner[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const navItems = navigationItems(router, () => {
    setIsLoggedIn(false);
    router.push("/signin");
  });

  // 로그인 체크
  useEffect(() => {
    if (!mounted) return;
    if (!isLoggedIn) router.replace("/signin");
  }, [mounted, isLoggedIn, router]);

  // 데이터 로드
  useEffect(() => {
    if (!mounted || !isLoggedIn) return;
    let mountedFlag = true;
    setIsLoading(true);
    setError(null);

    getAdminNoticeBanners()
      .then((list) => mountedFlag && setBanners(list ?? []))
      .catch((e) => {
        console.error(e);
        if (mountedFlag) setError("공지 배너를 불러오지 못했어요.");
      })
      .finally(() => mountedFlag && setIsLoading(false));

    return () => {
      mountedFlag = false;
    };
  }, [mounted, isLoggedIn]);

  const handleCardClick = (item: AdminNoticeBanner) => {
    const url = item.bannerImage?.onClickUrl;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      router.push(`/notices/${item.noticeId}`); // 내부 상세로 이동
    }
  };

  // SSR/CSR 첫 렌더를 동일하게 만들기 위해 빈 컨테이너 반환
  if (!mounted) return <div className="min-h-screen bg-gray-50" />;

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation items={navItems} />

      <main className="max-w-6xl mx-auto p-4 pt-12">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">공지사항</h1>
              <p className="text-gray-600 mt-2">
                배너형 공지들을 카드 그리드로 확인할 수 있어요.
              </p>
            </div>
            <button
              onClick={() => router.push("/notice/write")}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              새 공지 만들기
            </button>
          </div>

          {/* 상태 영역 */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl h-44 bg-gray-200" />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div className="text-center text-red-600 py-10">{error}</div>
          )}

          {!isLoading && !error && banners.length === 0 && (
            <div className="text-center text-gray-500 py-10">
              등록된 공지 배너가 없습니다.
            </div>
          )}

          {/* 그리드 */}
          {!isLoading && !error && banners.length > 0 && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {banners.map((item) => (
                <li
                  key={item.noticeId}
                  className="group rounded-xl overflow-hidden border border-gray-100 shadow cursor-pointer bg-white"
                  onClick={() => handleCardClick(item)}
                  role="button"
                  aria-label={`공지 ${item.noticeId} 열기`}
                >
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={item.bannerImage.imageKey} // ✅ Audition과 동일: imageKey 그대로 사용
                      alt={`notice-${item.noticeId}`}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">
                      #{item.noticeId}
                    </span>
                    <span
                      className={
                        item.bannerImage.onClickUrl
                          ? "text-xs text-blue-600 underline"
                          : "text-xs text-gray-400"
                      }
                    >
                      {item.bannerImage.onClickUrl ? "외부 링크" : "상세 보기"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
