"use client";

import { useRef, useState } from "react";
import type { AuditionFeedback } from "@/types/audition";
import AdminIcon from "@/components/admin/AdminIcon";
import FeedbackRatingRadar from "@/components/FeedbackRatingRadar";
import { chronologicalFeedbackPins, formatFeedbackTimestamp } from "@/utils/advancedFeedback";
import workspace from "./AdvancedAuditionFeedback.module.css";
import styles from "./FeedbackHistoryDetails.module.css";

/** Read-only media from this feedback's historical application, never the current applicant. */
export default function FeedbackHistoryDetails({ feedback }: { feedback: AuditionFeedback }) {
  const videos = feedback.application?.videos ?? [];
  const [videoIndex, setVideoIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const selectedVideo = videos[videoIndex] ?? videos[0];
  const pins = chronologicalFeedbackPins(feedback.pins ?? []);
  const selectedPins = selectedVideo?.videoId != null
    ? pins.filter(({ pin }) => pin.videoId === selectedVideo.videoId)
    : videos.length === 0 ? pins : [];
  const unavailablePins = pins.filter(({ pin }) => !videos.some(video => video.videoId === pin.videoId));

  const seek = (positionMs: number) => {
    if (!selectedVideo?.videoUrl) return;
    if (videoRef.current?.readyState) videoRef.current.currentTime = positionMs / 1000;
    else {
      pendingSeek.current = positionMs / 1000;
      videoRef.current?.load();
    }
  };

  return <details className={styles.details} onToggle={event => { setOpen(event.currentTarget.open); if (!event.currentTarget.open) videoRef.current?.pause(); }}>
    <summary className={styles.summary}>
      <span className={styles.closedLabel}>자세히 보기</span><span className={styles.openLabel}>접기</span>
      <AdminIcon name="chevron_down" size={15} style={{ transition: "transform .15s" }} />
    </summary>
    <div className={styles.content}>
      <p className={styles.caption}>이전 오디션에 제출된 영상과 받은 피드백입니다. 읽기 전용으로 표시됩니다.</p>
      {!!feedback.itemScores?.length && <FeedbackRatingRadar scores={feedback.itemScores} />}
      {videos.length > 1 && <label className={styles.videoSelector}>제출 영상
        <select aria-label="이전 오디션 제출 영상 선택" value={videoIndex} onChange={event => { pendingSeek.current = null; setVideoIndex(Number(event.target.value)); }}>
          {videos.map((video, index) => <option key={video.videoId ?? index} value={index}>영상 {index + 1}</option>)}
        </select>
      </label>}
      <div className={workspace.workspace}>
        <div className={workspace.videoPane}>
          {selectedVideo?.videoUrl ? <video key={selectedVideo.videoId ?? videoIndex} ref={videoRef} className={workspace.video} src={selectedVideo.videoUrl} controls preload={open ? "auto" : "none"} aria-label={`이전 오디션 제출 영상 ${videoIndex + 1}`} onLoadedMetadata={event => { if (pendingSeek.current !== null) { event.currentTarget.currentTime = pendingSeek.current; pendingSeek.current = null; } }} />
            : <p className={styles.empty}>이전 오디션의 제출 영상이 없거나 확인할 수 없어요.</p>}
        </div>
        <section className={workspace.timelinePane} aria-label="이전 오디션 영상 피드백">
          <div className={workspace.timelineHeading}><b>영상 피드백 · {selectedPins.length}개</b><span>시간순</span></div>
          <div className={styles.timelineList}>
            {selectedPins.length === 0 ? <p className={styles.empty}>{pins.length === 0 ? "영상 시점별 피드백이 없어요." : "이 영상에 남긴 피드백이 없어요."}</p>
              : selectedPins.map(({ pin, index }) => <div key={pin.id ?? index} className={workspace.savedEntry}>
                <button type="button" className={workspace.timestamp} disabled={!selectedVideo?.videoUrl || selectedVideo.videoId !== pin.videoId} onClick={() => seek(pin.positionMs)} aria-label={`이전 영상 ${formatFeedbackTimestamp(pin.positionMs)} 시점으로 이동`}>{formatFeedbackTimestamp(pin.positionMs)}</button>
                <span className={workspace.savedMessage}>{pin.message}</span>
              </div>)}
          </div>
        </section>
      </div>
      {videos.length > 0 && unavailablePins.length > 0 && <div className={styles.unavailable}>
        <p>제출 영상을 확인할 수 없는 피드백 {unavailablePins.length}개</p>
        {unavailablePins.map(({ pin, index }) => <div key={pin.id ?? index} className={workspace.savedEntry}><span>{formatFeedbackTimestamp(pin.positionMs)}</span><span className={workspace.savedMessage}>{pin.message}</span></div>)}
      </div>}
    </div>
  </details>;
}
