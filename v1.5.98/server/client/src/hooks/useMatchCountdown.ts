import { useState, useEffect } from "react";

/**
 * 根据约球活动的日期和开始时间计算倒计时
 * @param matchDate  "YYYY-MM-DD"
 * @param startTime  "HH:MM"
 * @param status     活动状态
 */
export function useMatchCountdown(
  matchDate: string,
  startTime: string,
  status: string
) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    if (status === "completed" || status === "cancelled") {
      setTimeLeft("");
      return;
    }

    const getTarget = () => {
      const [h, m] = startTime.split(":").map(Number);
      const d = new Date(`${matchDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
      return d.getTime();
    };

    const tick = () => {
      const now = Date.now();
      const target = getTarget();
      const diff = target - now;

      if (diff <= 0) {
        setIsStarted(true);
        setTimeLeft("活动已开始");
        return;
      }

      setIsStarted(false);
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}天 ${hours}小时后开始`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}小时 ${minutes}分钟后开始`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}分 ${seconds}秒后开始`);
      } else {
        setTimeLeft(`${seconds}秒后开始`);
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [matchDate, startTime, status]);

  return { timeLeft, isStarted };
}
