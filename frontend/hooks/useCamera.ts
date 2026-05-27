"use client";
import { useRef, useState, useCallback, useEffect } from "react";

const FRAME_COUNT = 8;
const FRAME_INTERVAL = 320;
const BLINK_FRAME = 3;
const JPEG_QUALITY = 0.8;

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsActive(true);
    } catch (err: any) {
      const msg =
        err.name === "NotAllowedError" ? "Camera permission denied." :
        err.name === "NotFoundError" ? "No camera found." :
        "Could not access camera.";
      setError(msg);
    }
  }, []);

  useEffect(() => {
    if (!isActive || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.onloadedmetadata = async () => {
      try { await video.play(); } catch {}
    };
  }, [isActive]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
  }, []);

  const captureFrames = useCallback(
    (onPrompt?: (index: number) => void): Promise<string[]> =>
      new Promise((resolve, reject) => {
        if (!videoRef.current || !isActive) { reject(new Error("Camera not active")); return; }
        const frames: string[] = [];
        const canvas = document.createElement("canvas");
        const video = videoRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d")!;
        let frameIndex = 0;

        const captureFrame = () => {
          if (frameIndex >= FRAME_COUNT) { resolve(frames); return; }
          onPrompt?.(frameIndex);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frames.push(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
          frameIndex++;
          setTimeout(captureFrame, FRAME_INTERVAL);
        };
        captureFrame();
      }),
    [isActive]
  );

  useEffect(() => () => stopCamera(), [stopCamera]);

  return { videoRef, isActive, error, startCamera, stopCamera, captureFrames, BLINK_FRAME };
}
