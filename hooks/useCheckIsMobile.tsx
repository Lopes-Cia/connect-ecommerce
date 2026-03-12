import { useState, useEffect } from "react";

export default function useCheckIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  function updateIsMobile() {
    if (window.innerWidth <= 768) {
      setIsMobile(true);
    } else {
      setIsMobile(false);
    }
  }

  useEffect(() => {
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  return isMobile;
}
