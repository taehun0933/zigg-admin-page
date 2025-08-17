export interface MediaImageType {
  imageKey: string;
  onClickUrl: string;
}

export interface MediaVideoType {
  videoUrl: string;
  videoDuration: string;
}

export interface ImageRequestType {
  extension: string;  // "JPG", "PNG" 등
  width: number;      // 이미지 너비
  height: number;     // 이미지 높이
}

export interface VideoRequestType {
  videoDuration: string;    // "130" (초 단위 Duration)
  videoExtension: string;   // "MP4", "AVI" 등
}
