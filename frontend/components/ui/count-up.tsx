"use client";

import { useEffect, useState } from "react";

export default function CountUp({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(value);
      return;
    }

    let frame = 0;
    let startTime: number | undefined;
    const duration = 900;

    const animate = (time: number) => {
      startTime ??= time;
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(value * eased));

      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <span className={className}>{count.toLocaleString()}</span>;
}
