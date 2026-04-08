import { useState, useEffect, useCallback } from "react";

function getIsMobile() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.innerWidth <= 768;
}

export default function useCheckIsMobile() {
  const [isMobile, setIsMobile] = useState(getIsMobile);

  const handleResize = useCallback(() => {
    setIsMobile(getIsMobile());
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  return isMobile;
}
