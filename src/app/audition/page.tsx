"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation, { NavItem } from "@/components/NavigationBar";
import AuditionCard from "@/components/AuditionCard";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "@/components/Modal";

interface Audition {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  totalApplicants: number;
  selectedApplicants: number;
}

const allAuditions: Audition[] = [
  {
    id: 1,
    title: "2025 봄 시즌 오디션",
    startDate: "2025-04-01",
    endDate: "2025-04-30",
    totalApplicants: 0,
    selectedApplicants: 0,
  },
  {
    id: 2,
    title: "여름 히트곡 프로젝트",
    startDate: "2025-05-01",
    endDate: "2025-05-20",
    totalApplicants: 0,
    selectedApplicants: 0,
  },
  {
    id: 3,
    title: "글로벌 K-POP 오디션",
    startDate: "2025-06-01",
    endDate: "2025-06-10",
    totalApplicants: 0,
    selectedApplicants: 0,
  },
  {
    id: 4,
    title: "댄스 크루 오디션",
    startDate: "2025-07-01",
    endDate: "2025-07-15",
    totalApplicants: 0,
    selectedApplicants: 0,
  },
  {
    id: 5,
    title: "2025 겨울 시즌 오디션",
    startDate: "2025-01-01",
    endDate: "2025-01-10",
    totalApplicants: 50,
    selectedApplicants: 10,
  },
  {
    id: 6,
    title: "가을 콜라보레이션",
    startDate: "2024-10-01",
    endDate: "2024-10-05",
    totalApplicants: 30,
    selectedApplicants: 5,
  },
  {
    id: 7,
    title: "여름 아이돌 오디션",
    startDate: "2024-07-01",
    endDate: "2024-07-20",
    totalApplicants: 200,
    selectedApplicants: 5,
  },
  {
    id: 8,
    title: "봄 솔로 아티스트",
    startDate: "2024-04-01",
    endDate: "2024-04-15",
    totalApplicants: 100,
    selectedApplicants: 15,
  },
  {
    id: 9,
    title: "겨울 래퍼 오디션",
    startDate: "2024-01-01",
    endDate: "2024-01-10",
    totalApplicants: 80,
    selectedApplicants: 8,
  },
  {
    id: 10,
    title: "가을 밴드 오디션",
    startDate: "2023-09-01",
    endDate: "2023-09-10",
    totalApplicants: 40,
    selectedApplicants: 5,
  },
  {
    id: 11,
    title: "여름 댄스 크루",
    startDate: "2023-06-01",
    endDate: "2023-06-20",
    totalApplicants: 60,
    selectedApplicants: 3,
  },
];

const AuditionPage: React.FC = () => {
  const router = useRouter();
  const { setIsLoggedIn, isLoggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [ongoingAuditions, setOngoingAuditions] = useState<Audition[]>([]);
  const [completedAuditions, setCompletedAuditions] = useState<Audition[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/signin");
    } else {
      setIsLoading(false);
    }
  }, [isLoggedIn, router]);

  useEffect(() => {
    const now = new Date();
    const ongoing = allAuditions.filter(
      (audition) => new Date(audition.endDate) >= now
    );
    const completed = allAuditions.filter(
      (audition) => new Date(audition.endDate) < now
    );
    setOngoingAuditions(ongoing);
    setCompletedAuditions(completed);
  }, []);

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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="오디션 생성"
        sizeMode="LARGE"
      >
        <div className="flex flex-col md:flex-row gap-8">
          {/* 왼쪽: Upload Photo */}
          <div className="flex-1 flex items-center justify-center bg-gray-100 min-h-[300px]">
            <span className="text-2xl font-bold">Upload Photo</span>
          </div>

          {/* 오른쪽: Form 입력 */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="block font-semibold mb-1">Audition Name</label>
              <input
                type="text"
                placeholder="Enter audition name"
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block font-semibold mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded p-2"
                />
              </div>
              <div className="flex-1">
                <label className="block font-semibold mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded p-2"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">지원자격</label>
              <input
                type="text"
                placeholder="Add a brief introduction"
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">간단한 설명</label>
              <input
                type="text"
                placeholder="Add a brief introduction"
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button className="bg-black text-white px-6 py-2 rounded">
                생성하기
              </button>
            </div>
          </div>
        </div>
      </Modal>
      <button
        className="fixed bottom-12 right-12 bg-black text-white px-6 py-3 rounded-lg transition-all hover:scale-105 cursor-pointer"
        onClick={() => {
          setIsModalOpen(true);
        }}
      >
        오디션 생성
      </button>
      <Navigation items={navItems} />
      <main className="max-w-7xl mx-auto px-4 pt-12 pb-24">
        {/* 섹션: 진행중인 오디션 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">진행중인 오디션</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ongoingAuditions.map((audition) => (
              <AuditionCard key={audition.id} audition={audition} />
            ))}
          </div>
        </section>

        {/* 섹션: 지난 오디션 */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">지난 오디션</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedAuditions.map((audition) => (
              <AuditionCard key={audition.id} audition={audition} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AuditionPage;
