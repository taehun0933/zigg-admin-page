"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navigation, { NavItem } from "@/components/NavigationBar";
import Header from "@/components/Header";

const Announcement: React.FC = () => {
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
    <div className="min-h-screen bg-gray-50 font-sans flex items-center">
      <main className="max-w-6xl mx-auto p-4 pt-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-800">공지사항</h1>
          <p className="mt-4 text-xl text-gray-600">
            현재 공지사항 페이지는 준비 중입니다.
          </p>
          <p className="mt-2 text-lg text-gray-600">
            곧 업데이트 될 예정이오니 잠시만 기다려 주세요.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-12 w-36 h-12 bg-blue-500 text-white rounded-xl text-lg font-bold cursor-pointer"
          >
            돌아가기
          </button>
        </div>
      </main>
    </div>
  );
};

export default Announcement;
