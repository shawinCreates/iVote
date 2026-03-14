"use client";
import { useEffect, useState } from "react";

interface TypewriterBannerProps {
  message: string;
  speed?: number;   // typing speed in ms per character
  pause?: number;   // pause before reset in ms
}export default function TypewriterBanner({
  message,
  speed = 100,
  pause = 2000,
}: TypewriterBannerProps) {
  const [displayed, setDisplayed] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let typing: NodeJS.Timeout;

    if (index < message.length) {
      typing = setTimeout(() => {
        setDisplayed((prev) => prev + message[index]);
        setIndex((prev) => prev + 1);
      }, speed);
    } else {
      typing = setTimeout(() => {
        setDisplayed("");
        setIndex(0);
      }, pause);
    }

    return () => clearTimeout(typing);
  }, [index, message, speed, pause]);  return (
    <div className="text-lg font-mono text-foreground">
      {displayed}
      <span className="animate-pulse">|</span>
    </div>
  );
}