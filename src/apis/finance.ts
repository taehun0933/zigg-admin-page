import apiClient from "@/utils/apiClient";
import { handleApiError } from "@/utils/apiError";

export type FinanceType = "REVENUE" | "EXPENSE";
export type FinanceSource = "GOOGLE_PLAY" | "APP_STORE" | "AWS" | "MANUAL";
export type CurrencyType = "KRW" | "USD";

export interface FinanceTransaction {
  id: number;
  type: FinanceType;
  source: FinanceSource;
  category: string | null;
  amountKrw: number;
  originalCurrency: CurrencyType;
  originalAmount: number | null; // KRW 가 아닐 때만
  exchangeRate: number | null; // 1 원본통화 = ? KRW
  description: string | null;
  transactionDate: string; // "YYYY-MM-DD"
  registeredByUserId: number | null;
  createdAt: string; // ISO datetime
}

export interface FinanceSummary {
  totalRevenue: number;
  totalExpense: number;
  initialBalance: number;
  balance: number; // = initialBalance + totalRevenue - totalExpense
}

// Spring Page 래퍼
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // 0-base 현재 페이지
  size: number; // 20
  first: boolean;
  last: boolean;
}

export interface CreateFinanceTxnBody {
  type: FinanceType;
  amount: number; // KRW, 양수
  transactionDate: string; // "YYYY-MM-DD"
  category?: string | null;
  description?: string | null;
}

// 라벨 상수 (UI 표기)
export const TYPE_LABEL: Record<FinanceType, string> = {
  REVENUE: "수익",
  EXPENSE: "지출",
};

export const SOURCE_LABEL: Record<FinanceSource, string> = {
  GOOGLE_PLAY: "구글 플레이",
  APP_STORE: "앱스토어",
  AWS: "AWS",
  MANUAL: "수동 등록",
};

export const EXPENSE_CATEGORIES = ["마케팅", "외주", "서버", "기타"] as const;

export async function getFinanceSummary(): Promise<FinanceSummary | null> {
  try {
    const res = await apiClient.get("/finance/summary");
    return res.data;
  } catch (e) {
    handleApiError(e);
    return null;
  }
}

export async function getFinanceTransactions(params: {
  type?: FinanceType; // 미지정 → 전체
  page?: number; // 0-base, 기본 0
}): Promise<Page<FinanceTransaction> | null> {
  try {
    const res = await apiClient.get("/finance/transactions", {
      params: { type: params.type, page: params.page ?? 0 }, // size 는 서버가 20 고정
    });
    return res.data;
  } catch (e) {
    handleApiError(e);
    return null;
  }
}

export async function createFinanceTransaction(
  body: CreateFinanceTxnBody
): Promise<FinanceTransaction> {
  try {
    const res = await apiClient.post("/finance/transactions", body);
    return res.data;
  } catch (e) {
    handleApiError(e);
    throw e;
  }
}

export async function deleteFinanceTransaction(id: number): Promise<void> {
  try {
    await apiClient.delete(`/finance/transactions/${id}`); // 204
  } catch (e) {
    handleApiError(e);
    throw e;
  }
}
