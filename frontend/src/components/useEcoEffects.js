import { useEffect, useMemo, useRef } from "react";

const useEcoEffects = () => {
  const containerRef = useRef(null);
  const bubblesRef = useRef([]);

  // 비눗방울 데이터 15개 생성
  const bubbleData = useMemo(() => {
    return [...Array(15)].map(() => ({
      left: `${Math.random() * 90}%`,
      top: `${Math.random() * 90}%`,
      size: `${Math.random() * 20 + 10}px`,
      delay: `${Math.random() * 5}s`,
    }));
  }, []);

  // 반딧불이 데이터 25개 생성
  const fireflyData = useMemo(() => {
    return [...Array(25)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 3 + 2}s`,
      animationDelay: `${Math.random() * 5}s`,
    }));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      const { clientX: x, clientY: y } = e;

      // 1. 나뭇잎 생성
      if (Math.random() > 0.88) {
        const leaf = document.createElement("span");
        leaf.classList.add("particle-leaf");
        leaf.style.left = `${x}px`;
        leaf.style.top = `${y}px`;
        const size = Math.random() * 10 + 10;
        leaf.style.width = `${size}px`;
        leaf.style.height = `${size}px`;
        leaf.style.transform = `rotate(${Math.random() * 360}deg)`;
        container.appendChild(leaf);
        setTimeout(() => leaf.remove(), 1500);
      }

      // 2. 비눗방울 피하기 로직
      bubblesRef.current.forEach((bubble) => {
        if (!bubble) return;
        const rect = bubble.getBoundingClientRect();
        const bX = rect.left + rect.width / 2;
        const bY = rect.top + rect.height / 2;
        const dist = Math.hypot(x - bX, y - bY);

        if (dist < 150) {
          const angle = Math.atan2(y - bY, x - bX);
          const force = (150 - dist) / 2;
          bubble.style.transform = `translate(${-Math.cos(angle) * force}px, ${-Math.sin(angle) * force}px) scale(1.2)`;
          bubble.style.transition = "transform 0.2s ease-out";
        } else {
          bubble.style.transform = `translate(0, 0) scale(1)`;
          bubble.style.transition = "transform 1s ease-in-out";
        }
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return { containerRef, bubblesRef, bubbleData, fireflyData };
};

export default useEcoEffects;