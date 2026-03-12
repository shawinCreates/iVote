"use client";
import { useState, useEffect } from "react";

interface TypewriterBannerProps {
  message: string;
  speed?: number; // optional typing speed in ms
  pause?: number; // optional pause before repeating
}

export default function TypewriterBanner({
  message,
  speed = 120,
  pause = 1000,
}: TypewriterBannerProps) {
  const [typedText, setTypedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (index < message.length) {
      interval = setInterval(() => {
        setTypedText(message.slice(0, index + 1));
        setIndex((prev) => prev + 1);
      }, speed);
    } else {
      // pause before restarting
      interval = setTimeout(() => {
        setTypedText("");
        setIndex(0);
      }, pause);
    }

    return () => clearInterval(interval);
  }, [index, message, speed, pause]);

  return (
    <p className="mb-4 text-sm font-medium text-red-600 relative z-10 font-mono">
      {typedText}
      <span className="animate-pulse">|</span>
    </p>
  );
}