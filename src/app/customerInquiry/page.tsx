"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/NavigationBar";
import { navigationItems } from "@/utils/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Pagination } from "@mui/material";
import Modal from "@/components/Modal";
import {
  getCustomerInquiryMessages,
  postCustomerInquiryReply,
} from "@/apis/customerInquiry";
import {
  CustomerInquiryDetailType,
  CustomerInquiryReplyType,
} from "@/types/customerInquiry";
import { formatYmdHm } from "@/utils/common";

const PAGE_SIZE = 20;

function ReplyItem({ reply }: { reply: CustomerInquiryReplyType }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <span className="font-medium text-gray-700">
          {reply.sender.userNickname}
        </span>
        <span>{formatYmdHm(reply.createdAt)}</span>
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
        {reply.message}
      </p>
    </div>
  );
}

export default function CustomerInquiryPage() {
  const router = useRouter();
  const { isLoggedIn, setIsLoggedIn } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<CustomerInquiryDetailType[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedInquiry, setSelectedInquiry] =
    useState<CustomerInquiryDetailType | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchMessages = useCallback(async (page: number) => {
    try {
      setError(null);
      const data = await getCustomerInquiryMessages({
        page: page - 1,
        size: PAGE_SIZE,
        sort: "createAt,desc",
      });
      setContent(data.content);
      setTotalPages(data.totalPages);
    } catch (e) {
      console.error(e);
      setError("문의 목록을 불러오지 못했어요.");
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isLoggedIn) {
      router.replace("/signin");
      return;
    }
    setIsLoading(true);
    fetchMessages(currentPage);
  }, [mounted, isLoggedIn, currentPage, fetchMessages, router]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    router.push("/signin");
  };

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setCurrentPage(value);
  };

  const openDetail = (item: CustomerInquiryDetailType) => {
    setSelectedInquiry(item);
    setReplyText("");
    setReplyError(null);
  };

  const closeDetail = () => {
    setSelectedInquiry(null);
    setReplyText("");
    setReplyError(null);
  };

  const handleSendReply = async () => {
    if (!selectedInquiry || !replyText.trim()) return;
    setReplySending(true);
    setReplyError(null);
    try {
      const newReply = await postCustomerInquiryReply(selectedInquiry.id, {
        message: replyText.trim(),
      });
      setSelectedInquiry((prev) =>
        prev ? { ...prev, replies: [...prev.replies, newReply] } : null
      );
      setContent((prev) =>
        prev.map((it) =>
          it.id === selectedInquiry.id
            ? { ...it, replies: [...it.replies, newReply] }
            : it
        )
      );
      setReplyText("");
    } catch (e) {
      console.error(e);
      setReplyError("답장 전송에 실패했어요.");
    } finally {
      setReplySending(false);
    }
  };

  const navItems = navigationItems(router, handleLogout);

  if (!mounted) return <div className="min-h-screen bg-gray-50" />;
  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Modal
        isOpen={!!selectedInquiry}
        onClose={closeDetail}
        title={selectedInquiry ? selectedInquiry.title : ""}
        sizeMode="LARGE"
      >
        {selectedInquiry && (
          <div className="flex flex-col min-h-0">
            {/* 문의 상세 */}
            <div className="border-b border-gray-200 pb-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <span>{selectedInquiry.user.userNickname}</span>
                <span>·</span>
                <span>{formatYmdHm(selectedInquiry.createdAt)}</span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap break-words">
                {selectedInquiry.message}
              </p>
            </div>

            {/* 답장 목록 (스크롤) */}
            <div className="flex-1 overflow-y-auto max-h-[280px] min-h-[80px] space-y-3 pr-2 border border-gray-100 rounded-lg p-3 bg-gray-50">
              {selectedInquiry.replies.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">
                  아직 답장이 없어요.
                </p>
              ) : (
                selectedInquiry.replies.map((reply) => (
                  <ReplyItem key={reply.id} reply={reply} />
                ))
              )}
            </div>

            {/* 답장 입력 */}
            <div className="mt-4 border-t border-gray-200 pt-4">
              {replyError && (
                <p className="text-red-600 text-sm mb-2">{replyError}</p>
              )}
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="답장을 입력하세요..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={replySending}
              />
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={replySending || !replyText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {replySending ? "전송 중..." : "답장 보내기"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Navigation items={navItems} />

      <main className="max-w-6xl mx-auto p-4 pt-12">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">고객 목소리함</h1>
            <p className="text-gray-600 mt-2">
              고객 문의 목록을 확인하고 답장할 수 있어요.
            </p>
          </div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
          )}

          {!isLoading && error && (
            <div className="text-center text-red-600 py-10">{error}</div>
          )}

          {!isLoading && !error && content.length === 0 && (
            <div className="text-center text-gray-500 py-10">
              등록된 문의가 없습니다.
            </div>
          )}

          {!isLoading && !error && content.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        번호
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        제목
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작성자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        답장 수
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        답장 여부
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작성일
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {content.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => openDetail(item)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {item.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.user.userNickname}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.replies.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.replies.length >= 1 ? (
                            <span className="text-green-600 font-medium" title="답장 완료">
                              ✓
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatYmdHm(item.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-center mt-8">
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  showFirstButton
                  showLastButton
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
