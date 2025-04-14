"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import NavigationBar from "@/components/NavigationBar";
import Modal from "@/components/Modal";
import axios from "axios";

export default function SignInPage() {
  const router = useRouter();
  const { setIsLoggedIn } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoggedIn(true);
    router.push("/dashboard");
  };

  const handleRegister = async () => {
    try {
      const response = await axios.post(
        "https://dev.achoom-zigg.com/admin/v1/register",
        {
          email: "test@naver.com",
          password: "test",
        }
      );
      console.log("Registration success:", response.data);
      setIsLoggedIn(true);
      router.push("/dashboard");
    } catch (err) {
      console.error("Registration error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="모달 제목"
      >
        <p>이곳에 모달 내용이 들어갑니다.</p>
      </Modal>
      <NavigationBar items={[]} />

      <header className="bg-gray-700 text-white text-center py-16 px-4">
        <h1 className="text-4xl font-bold mb-4">관리자 페이지</h1>
        <p>로그인을 진행해 주세요.</p>
      </header>

      <main className="flex flex-col md:flex-row justify-center items-start max-w-6xl mx-auto p-4 pt-12 gap-8">
        <section className="flex-1 max-w-md bg-white shadow rounded p-6">
          <h2 className="text-2xl font-bold mb-2">로그인</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label htmlFor="email" className="font-semibold">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="제공받은 이메일을 입력해 주세요."
              className="border border-gray-300 rounded p-2"
            />

            <label htmlFor="password" className="font-semibold">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="제공받은 비밀번호를 입력해 주세요."
              className="border border-gray-300 rounded p-2"
            />

            <button
              type="submit"
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mt-4"
            >
              Login
            </button>
          </form>
        </section>

        <section className="flex-1 max-w-md bg-white shadow rounded p-6">
          <h2 className="text-2xl font-bold mb-2">회원가입</h2>
          <div className="flex justify-end">
            <button
              onClick={handleRegister}
              className="mt-4 bg-green-500 text-white p-2 rounded hover:bg-green-600"
            >
              회원가입
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
