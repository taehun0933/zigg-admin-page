"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation, { NavItem } from "@/components/NavigationBar";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";

const AuditionPage: React.FC = () => {
  const router = useRouter();
  const { setIsLoggedIn, isLoggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/signin");
    } else {
      setIsLoading(false);
    }
  }, [isLoggedIn, router]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    router.push("/signin");
  };

  const navItems: NavItem[] = [
    {
      label: "오디션 관리",
      onClick: () => router.push("/audition"),
    },
    {
      label: "공지사항 관리",
      onClick: () => router.push("/announcement"),
    },
    {
      label: "로그아웃",
      onClick: handleLogout,
    },
  ];

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navigation items={navItems} />
      <main className="max-w-6xl mx-auto p-4 pt-12">
        {/* 섹션: 다가오는 오디션 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">다가오는 오디션</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded p-4">
              <h3 className="text-xl font-bold mb-2">오디션 제목 1</h3>
              <p className="text-gray-700">일정: 2025-05-01</p>
              <p className="text-gray-600 mt-2">
                상세 내용: 지원 자격, 심사 기준 등 오디션에 대한 설명을
                포함합니다.
              </p>
            </div>
            <div className="bg-white shadow rounded p-4">
              <h3 className="text-xl font-bold mb-2">오디션 제목 2</h3>
              <p className="text-gray-700">일정: 2025-06-15</p>
              <p className="text-gray-600 mt-2">
                상세 내용: 이번 오디션의 주요 특징 및 참가 정보를 안내합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 섹션: 과거 오디션 */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">지난 오디션</h2>
          <p className="text-gray-700">
            이전 오디션의 결과와 후기를 확인해보세요.
          </p>
          {/* 필요 시 과거 오디션 목록 추가 */}
        </section>
      </main>
    </div>
  );
};

export default AuditionPage;
