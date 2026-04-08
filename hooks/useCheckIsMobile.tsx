import { useState, useEffect, useCallback } from "react";

function getIsMobile() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.innerWidth <= 768;
}

function resolveIsMobile(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.innerWidth <= 768;
}

export default function useCheckIsMobile() {
  const [isMobile, setIsMobile] = useState(resolveIsMobile);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(resolveIsMobile());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}
