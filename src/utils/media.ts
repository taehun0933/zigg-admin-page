import { VideoRequestType, ImageRequestType } from "@/types/media";



// 1. 비디오 duration 구하기
export const getVideoDuration = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.floor(video.duration).toString()); // 초 단위 string 반환
      };

      video.onerror = (e) => {
        reject(new Error("비디오 메타데이터를 불러올 수 없습니다."));
      };

      video.src = URL.createObjectURL(file);
    } catch (err) {
      reject(err);
    }
  });
};

// 2. 확장자 추출 후 대문자 반환 (video / image 공용)
export const getFileExtension = (file: File): string => {
  const ext = file.name.split(".").pop();
  return ext ? ext.toUpperCase() : "";
};


// 3. 이미지 width, height 구하기
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        reject(new Error("이미지 로딩 실패"));
      };

      img.src = URL.createObjectURL(file);
    } catch (err) {
      reject(err);
    }
  });
};

export const formatHms = (totalSec: number): string => {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export const getVideoDurationSec = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    const url = URL.createObjectURL(file);

    el.onloadedmetadata = () => {
      const sec = Math.floor(el.duration || 0);
      URL.revokeObjectURL(url);
      resolve(sec);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("비디오 메타데이터를 불러올 수 없습니다."));
    };
    el.src = url;
  });