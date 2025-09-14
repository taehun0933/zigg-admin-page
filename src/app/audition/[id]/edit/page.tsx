"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navigation, { NavItem } from "@/components/NavigationBar";

interface AuditionEditData {
  title: string;
  company: string;
  qualification: string;
  startDate: string;
  endDate: string;
}

const AuditionEditPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [form, setForm] = useState<AuditionEditData | null>(null);
  const [loading, setLoading] = useState(true);

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL_FOR_ADMIN;

  // 헤더용 navItems
  const navItems: NavItem[] = [
    { label: "오디션 관리", onClick: () => router.push("/audition") },
    { label: "공지사항 관리", onClick: () => router.push("/notice") },
    { label: "로그아웃", onClick: () => router.push("/signin") },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token"); // 토큰 위치에 따라 수정
        const res = await fetch(`${BASE_URL}/auditions/${id}`, {
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        setForm({
          title: data.title,
          company: data.company,
          qualification: data.qualification,
          startDate: data.startDate,
          endDate: data.endDate,
        });
      } catch (e) {
        alert("오디션 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, BASE_URL]);

  if (loading || !form) {
    return <div className="p-8">Loading...</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navigation items={navItems} />
      <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded shadow">
        <h2 className="text-2xl font-bold mb-6">오디션 정보 수정</h2>
        <table className="w-full border">
          <tbody>
            <tr>
              <th className="text-left p-2 border">제목</th>
              <td className="p-2 border">
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="w-full border rounded p-1"
                />
              </td>
            </tr>
            <tr>
              <th className="text-left p-2 border">기획사명</th>
              <td className="p-2 border">
                <input
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  className="w-full border rounded p-1"
                />
              </td>
            </tr>
            <tr>
              <th className="text-left p-2 border">지원자격</th>
              <td className="p-2 border">
                <input
                  name="qualification"
                  value={form.qualification}
                  onChange={handleChange}
                  className="w-full border rounded p-1"
                />
              </td>
            </tr>
            <tr>
              <th className="text-left p-2 border">시작일</th>
              <td className="p-2 border">
                <input
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleChange}
                  className="w-full border rounded p-1"
                />
              </td>
            </tr>
            <tr>
              <th className="text-left p-2 border">종료일</th>
              <td className="p-2 border">
                <input
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={handleChange}
                  className="w-full border rounded p-1"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <div className="flex justify-end mt-6">
          <button
            className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition-colors"
            onClick={async () => {
              if (!form) return;
              const confirmed = window.confirm("수정하시겠습니까?");
              if (!confirmed) return;
              const token = localStorage.getItem("token");
              try {
                const res = await fetch(`${BASE_URL}/auditions/${id}`, {
                  method: "PATCH",
                  headers: {
                    Authorization: `${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    title: form.title,
                    company: form.company,
                    qualification: form.qualification,
                    startDate: form.startDate,
                    endDate: form.endDate,
                  }),
                });
                if (!res.ok) throw new Error("수정 실패");
                // 성공 시 상세 페이지로 이동
                router.push(`/audition/${id}`);
              } catch (e) {
                alert("수정에 실패했습니다.");
              }
            }}
          >
            수정하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditionEditPage;
