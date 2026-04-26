"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/NavigationBar";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { navigationItems } from "@/utils/navigation";
import {
  searchUsersByNickname,
  grantTickets,
  UserSearchResult,
} from "@/apis/ticket";

export default function TicketPage() {
  const router = useRouter();
  const { setIsLoggedIn } = useAuth();

  const [searchNickname, setSearchNickname] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [amount, setAmount] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogout = () => {
    setIsLoggedIn(false);
    router.push("/signin");
  };

  const navItems = navigationItems(router, handleLogout);

  const handleSearch = async () => {
    if (!searchNickname.trim()) return;
    setIsSearching(true);
    setSelectedUser(null);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      const results = await searchUsersByNickname(searchNickname.trim());
      setSearchResults(results);
      if (results.length === 0) setErrorMessage("해당 닉네임의 유저를 찾을 수 없습니다.");
    } catch {
      setErrorMessage("유저 검색에 실패했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleGrant = async () => {
    if (!selectedUser) return;
    if (amount <= 0) {
      setErrorMessage("지급 수량은 1장 이상이어야 합니다.");
      return;
    }
    setIsGranting(true);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      const res = await grantTickets(
        selectedUser.userNickname,
        amount,
        reason || undefined
      );
      setSuccessMessage(res.message);
      setSelectedUser(null);
      setSearchResults([]);
      setSearchNickname("");
      setAmount(1);
      setReason("");
    } catch {
      setErrorMessage("티켓 지급에 실패했습니다.");
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navigation items={navItems} />
      <Header
        title="티켓 수동 지급"
        subTitle="결제 오류 발생 시 유저 닉네임으로 티켓을 직접 지급합니다."
      />

      <main className="max-w-2xl mx-auto p-6 pt-10 space-y-6">
        {/* 유저 검색 */}
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">1. 유저 검색</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="닉네임 입력"
              value={searchNickname}
              onChange={(e) => setSearchNickname(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isSearching ? "검색 중..." : "검색"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
              {searchResults.map((user) => (
                <li
                  key={user.userId}
                  onClick={() => {
                    setSelectedUser(user);
                    setSearchResults([]);
                    setErrorMessage("");
                  }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors ${
                    selectedUser?.userId === user.userId ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  {user.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                      ?
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-800">{user.userNickname}</p>
                    {user.userName && (
                      <p className="text-xs text-gray-400">{user.userName}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 선택된 유저 + 지급 */}
        {selectedUser && (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">2. 티켓 지급</h2>

            <div className="flex items-center gap-3 bg-blue-50 rounded-lg px-4 py-3">
              {selectedUser.profileImageUrl ? (
                <img
                  src={selectedUser.profileImageUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-500">
                  ?
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-800">{selectedUser.userNickname}</p>
                <p className="text-xs text-gray-500">ID: {selectedUser.userId}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  지급 수량 (장)
                </label>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사유 (선택)
                </label>
                <input
                  type="text"
                  placeholder="예: 결제 오류 보상"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleGrant}
              disabled={isGranting}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isGranting ? "지급 중..." : `${selectedUser.userNickname}님께 ${amount}장 지급하기`}
            </button>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm font-medium">
            ✅ {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            ❌ {errorMessage}
          </div>
        )}
      </main>
    </div>
  );
}
