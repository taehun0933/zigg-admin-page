"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation, { NavItem } from "@/components/NavigationBar";
import AuditionCard from "@/components/AuditionCard";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "@/components/Modal";
import { getAuditions, postNewAudition } from "@/apis/audition";

export interface Audition {
  id: number;
  title: string;
  company: string;
  qualification: string;
  thumbnail: {
    imageKey: string;
    onClickUrl: string | null;
  };
  startDate: string;
  endDate: string;
}

const AuditionPage: React.FC = () => {
  const router = useRouter();
  const { setIsLoggedIn, isLoggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [ongoingAuditions, setOngoingAuditions] = useState<Audition[]>([]);
  const [completedAuditions, setCompletedAuditions] = useState<Audition[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [auditionForm, setAuditionForm] = useState({
    title: "",
    company: "",
    qualification: "",
    thumbnailId: 0, // 아직 업로드 안 붙였으므로 고정값
    startDate: "",
    endDate: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAuditionForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    try {
      await postNewAudition(auditionForm);
      alert("오디션이 생성되었습니다!");
      setIsModalOpen(false);
    } catch (error) {
      alert("오류 발생: " + String(error));
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/signin");
    } else {
      setIsLoading(false);
    }
  }, [isLoggedIn, router]);

  useEffect(() => {
    getAuditions()
      .then((data) => {
        setAuditions(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const now = new Date();
    const ongoing = auditions.filter(
      (audition) => new Date(audition.endDate) >= now
    );
    const completed = auditions.filter(
      (audition) => new Date(audition.endDate) < now
    );
    setOngoingAuditions(ongoing);
    setCompletedAuditions(completed);
  }, [auditions]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    router.push("/signin");
  };

  const navItems: NavItem[] = [
    { label: "오디션 관리", onClick: () => router.push("/audition") },
    { label: "공지사항 관리", onClick: () => router.push("/announcement") },
    { label: "로그아웃", onClick: handleLogout },
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
          {/* 왼쪽: 이미지 업로드 */}
          <div
            className="flex-1 flex items-center justify-center bg-gray-100 min-h-[300px] cursor-pointer relative overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadedImage ? (
              <img
                src={uploadedImage}
                alt="Uploaded"
                className="object-contain max-h-full max-w-full"
              />
            ) : (
              <span className="text-2xl font-bold text-gray-400">
                Upload Photo
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* 오른쪽: 입력 폼 */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="block font-semibold mb-1">오디션 제목</label>
              <input
                name="title"
                type="text"
                value={auditionForm.title}
                onChange={handleInputChange}
                placeholder="EX)JYP Audition"
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">기획사명</label>
              <input
                name="company"
                type="text"
                value={auditionForm.company}
                onChange={handleInputChange}
                placeholder="EX)JYP 엔터테인먼트"
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block font-semibold mb-1">시작일</label>
                <input
                  name="startDate"
                  type="date"
                  value={auditionForm.startDate}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded p-2"
                />
              </div>
              <div className="flex-1">
                <label className="block font-semibold mb-1">종료일</label>
                <input
                  name="endDate"
                  type="date"
                  value={auditionForm.endDate}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded p-2"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">지원자격</label>
              <input
                name="qualification"
                type="text"
                value={auditionForm.qualification}
                onChange={handleInputChange}
                placeholder="EX)키 150cm 이상"
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSubmit}
                className="bg-black text-white px-6 py-2 rounded cursor-pointer"
              >
                생성하기
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <button
        className="fixed bottom-12 right-12 bg-black text-white px-6 py-3 rounded-lg transition-all hover:scale-105 cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        오디션 생성
      </button>

      <Navigation items={navItems} />
      <main className="max-w-7xl mx-auto px-4 pt-12 pb-24">
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">진행중인 오디션</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ongoingAuditions.length === 0 ? (
              <div>조건에 해당하는 오디션 정보가 없습니다!</div>
            ) : (
              ongoingAuditions.map((audition) => (
                <AuditionCard key={audition.id} audition={audition} />
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">지난 오디션</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedAuditions.length === 0 ? (
              <div>조건에 해당하는 오디션 정보가 없습니다!</div>
            ) : (
              completedAuditions.map((audition) => (
                <AuditionCard key={audition.id} audition={audition} />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AuditionPage;
