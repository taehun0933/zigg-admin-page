export interface MediaImageType {
  id: number;
  url: string;
  width: number;
  height: number;
  uploadState: "PENDING" | "UPLOADED" | "FAILED"; // todo: 해당값 맞는지 확인 필요
}

export interface MediaVideoType {
  id: number;
  url: string;
  duration: string;
  width: number;
  height: number;
  uploadState: "PENDING" | "UPLOADED" | "FAILED";
}
