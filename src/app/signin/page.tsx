"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import NavigationBar from "@/components/NavigationBar";
import Modal from "@/components/Modal";
import { authService } from "@/apis/login";
import { ApiErrorType } from "@/types/apiType";

export default function SignInPage() {
  const router = useRouter();
  const { setIsLoggedIn } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await authService.login(formData.email, formData.password);
      setIsLoggedIn(true);
      router.push("/dashboard");
    } catch (error) {
      // const apiError = error as ApiErrorType;
      alert("아이디 또는 비밀번호를 확인해 주세요!");
    }
  };

  // const handleRegister = async () => {
  //   try {
  //     await authService.register("achoom@zigg.com", "soma1511!");
  //     setIsLoggedIn(true);
  //     router.push("/dashboard");
  //   } catch (error) {
  //     const apiError = error as ApiErrorType;
  //     alert(apiError.message);
  //   }
  // };

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
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <label htmlFor="email" className="font-semibold">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
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
              autoComplete="on"
              value={formData.password}
              onChange={handleChange}
              placeholder="제공받은 비밀번호를 입력해 주세요."
              className="border border-gray-300 rounded p-2"
            />

            <button
              type="submit"
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mt-4 cursor-pointer"
            >
              Login
            </button>
          </form>
        </section>

        {/* <section className="flex-1 max-w-md bg-white shadow rounded p-6">
          <h2 className="text-2xl font-bold mb-2">회원가입</h2>
          <div className="flex justify-end">
            <button
              onClick={handleRegister}
              className="mt-4 bg-green-500 text-white p-2 rounded hover:bg-green-600"
            >
              회원가입
            </button>
          </div>
        </section> */}
      </main>
    </div>
  );
}
