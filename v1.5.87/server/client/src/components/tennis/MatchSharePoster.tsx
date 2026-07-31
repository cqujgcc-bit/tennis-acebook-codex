import { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface MatchSharePosterProps {
  open: boolean;
  onClose: () => void;
  match: {
    id: number;
    title: string;
    matchType: string;
    levelRequired: string;
    matchDate: string;
    startTime: string;
    endTime?: string | null;
    venueName: string;
    venueAddress?: string | null;
    courtNo?: string | null;
    imageUrl?: string | null;
    currentParticipants: number;
    maxParticipants: number;
    costPerPerson?: number | string | null;
    description?: string | null;
  };
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  singles: "单打", doubles: "双打", mixed_doubles: "混双", practice: "练球", group: "团体",
};

const LEVEL_SHORT: Record<string, string> = {
  any: "不限", itf1: "ITF 1", itf2: "ITF 2", itf3: "ITF 3", itf4: "ITF 4",
  itf5: "ITF 5", itf6: "ITF 6", itf7: "ITF 7", itf8: "ITF 8", itf9: "ITF 9", itf10: "ITF 10",
  beginner: "初级", intermediate: "中级", advanced: "高级",
};

// Wrap text to fit within maxWidth
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split("");
  const lines: string[] = [];
  let current = "";
  for (const char of words) {
    const test = current + char;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function MatchSharePoster({ open, onClose, match }: MatchSharePosterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [rendered, setRendered] = useState(false);

  const shareUrl = `${window.location.origin}/matches/${match.id}`;

  const drawPoster = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 750;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;

    // ── Background ──────────────────────────────────────────────────────────
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#0f2027");
    bgGrad.addColorStop(0.5, "#203a43");
    bgGrad.addColorStop(1, "#2c5364");

    // 如果有实景照片，用照片作上半部分背景，下半渐变为深色
    if (match.imageUrl) {
      try {
        const bgImg = new Image();
        bgImg.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          bgImg.onload = () => resolve();
          bgImg.onerror = () => reject();
          bgImg.src = match.imageUrl!;
        });
        const imgH = Math.round(H * 0.42);
        ctx.drawImage(bgImg, 0, 0, W, imgH);
        // 实景照片区域深色遮罩（保证文字可读）
        const overlayGrad = ctx.createLinearGradient(0, 0, 0, imgH);
        overlayGrad.addColorStop(0, "rgba(0,0,0,0.3)");
        overlayGrad.addColorStop(1, "rgba(15,32,39,0.88)");
        ctx.fillStyle = overlayGrad;
        ctx.fillRect(0, 0, W, imgH);
        // 下半部分纯深色背景
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, imgH, W, H - imgH);
        // 照片与深色过渡连接
        const transGrad = ctx.createLinearGradient(0, imgH - 60, 0, imgH + 20);
        transGrad.addColorStop(0, "rgba(15,32,39,0)");
        transGrad.addColorStop(1, "rgba(15,32,39,1)");
        ctx.fillStyle = transGrad;
        ctx.fillRect(0, imgH - 60, W, 80);
      } catch {
        // 回退默认渐变背景
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = "#4ade80";
        ctx.beginPath(); ctx.arc(W - 80, 120, 200, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(80, H - 100, 160, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    } else {
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);
      // ── Decorative circles
      ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = "#4ade80";
      ctx.beginPath(); ctx.arc(W - 80, 120, 200, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(80, H - 100, 160, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // ── Tennis ball decoration
      ctx.save(); ctx.globalAlpha = 0.12; ctx.strokeStyle = "#86efac"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(W - 90, 90, 60, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W - 90, 90, 40, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // ── Top accent bar ───────────────────────────────────────────────────────
    const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
    accentGrad.addColorStop(0, "#4ade80");
    accentGrad.addColorStop(1, "#22d3ee");
    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, 0, W, 6);

    // ── Logo / App name ──────────────────────────────────────────────────────
    ctx.font = "bold 28px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillStyle = "#4ade80";
    ctx.fillText("🎾 AceBook", 48, 62);

    ctx.font = "14px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("全国网球约球平台", 48, 84);

    // ── Type + Level badges ──────────────────────────────────────────────────
    const typeLabel = MATCH_TYPE_LABELS[match.matchType] ?? match.matchType;
    const levelLabel = LEVEL_SHORT[match.levelRequired] ?? match.levelRequired;

    const drawBadge = (text: string, x: number, y: number, color: string) => {
      ctx.font = "bold 22px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      const tw = ctx.measureText(text).width;
      const bw = tw + 28;
      const bh = 38;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y - bh + 8, bw, bh, 8);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(text, x + 14, y);
    };

    drawBadge(typeLabel, 48, 148, "rgba(74,222,128,0.25)");
    drawBadge(levelLabel, 48 + ctx.measureText(typeLabel).width + 56, 148, "rgba(34,211,238,0.2)");

    // ── Title ────────────────────────────────────────────────────────────────
    ctx.font = "bold 44px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillStyle = "#ffffff";
    const titleLines = wrapText(ctx, match.title, W - 96);
    titleLines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, 48, 220 + i * 56);
    });

    // ── Divider ──────────────────────────────────────────────────────────────
    const divY = 220 + Math.min(titleLines.length, 2) * 56 + 20;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(48, divY); ctx.lineTo(W - 48, divY); ctx.stroke();

    // ── Info rows ────────────────────────────────────────────────────────────
    const infoStartY = divY + 44;
    const infoItems = [
      { icon: "📅", label: "日期时间", value: `${match.matchDate}  ${match.startTime}${match.endTime ? ` – ${match.endTime}` : ""}` },
      { icon: "📍", label: "场地", value: match.venueName + (match.courtNo ? ` · ${match.courtNo}` : "") + (match.venueAddress ? `\n${match.venueAddress}` : "") },
      { icon: "👥", label: "名额", value: `${match.currentParticipants}/${match.maxParticipants} 人  ${match.maxParticipants - match.currentParticipants > 0 ? `还差 ${match.maxParticipants - match.currentParticipants} 人` : "已满员"}` },
      ...(match.costPerPerson && Number(match.costPerPerson) > 0 ? [{ icon: "\uD83D\uDCB0", label: "费用", value: `人均 ¥${Number(match.costPerPerson).toFixed(0)}` }] : []),
    ];

    let curY = infoStartY;
    for (const item of infoItems) {
      // Icon circle
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath(); ctx.arc(68, curY - 8, 20, 0, Math.PI * 2); ctx.fill();
      ctx.font = "18px serif";
      ctx.fillText(item.icon, 58, curY - 1);

      // Label
      ctx.font = "13px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillText(item.label, 100, curY - 14);

      // Value (with line break support)
      const valueLines = item.value.split("\n");
      ctx.font = "bold 22px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillStyle = "#ffffff";
      valueLines.forEach((vl, vi) => {
        const wrapped = wrapText(ctx, vl, W - 160);
        wrapped.forEach((wl, wi) => {
          ctx.fillText(wl, 100, curY + vi * 28 + wi * 28);
        });
        curY += wrapped.length * 28;
      });

      curY += 40;
    }

    // ── Description ──────────────────────────────────────────────────────────
    if (match.description) {
      const descY = curY + 10;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath(); ctx.roundRect(48, descY - 20, W - 96, 80, 12); ctx.fill();
      ctx.font = "18px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      const descLines = wrapText(ctx, match.description, W - 120);
      descLines.slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, 64, descY + i * 28);
      });
      curY = descY + 90;
    }

    // ── QR Code ──────────────────────────────────────────────────────────────
    const qrSize = 160;
    const qrX = W - 48 - qrSize;
    const qrY = H - 200;

    try {
      const qrDataUrl = await QRCode.toDataURL(shareUrl, {
        width: qrSize * 2,
        margin: 1,
        color: { dark: "#0f2027", light: "#ffffff" },
      });
      const qrImg = new Image();
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve();
        qrImg.src = qrDataUrl;
      });
      // QR background
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12); ctx.fill();
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch (_) {
      // QR generation failed, skip
    }

    // ── QR label ─────────────────────────────────────────────────────────────
    ctx.font = "bold 20px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillStyle = "#4ade80";
    ctx.fillText("扫码报名", 48, H - 160);
    ctx.font = "15px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("tennispro.cn", 48, H - 132);
    ctx.fillText("全国网球约球平台", 48, H - 108);

    // ── Bottom accent bar ────────────────────────────────────────────────────
    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, H - 6, W, 6);

    setRendered(true);
  }, [match, shareUrl]);

  useEffect(() => {
    if (open) {
      setRendered(false);
      setTimeout(drawPoster, 100);
    }
  }, [open, drawPoster]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `约球-${match.title.slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("海报已保存到本地");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("链接已复制");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败，请手动复制链接");
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopyLink();
      return;
    }
    try {
      const canvas = canvasRef.current;
      if (canvas) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob) {
          const file = new File([blob], "约球海报.png", { type: "image/png" });
          await navigator.share({ title: match.title, text: `来约球！${match.matchDate} ${match.venueName}`, url: shareUrl, files: [file] });
          return;
        }
      }
      await navigator.share({ title: match.title, url: shareUrl });
    } catch {
      // User cancelled or not supported
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">分享球局海报</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2">
          {/* Canvas poster preview */}
          <div className="relative rounded-xl overflow-hidden shadow-lg bg-[#0f2027]" style={{ aspectRatio: "750/1080" }}>
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{ display: "block" }}
            />
            {!rendered && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0f2027]">
                <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 pb-5 pt-3 grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleDownload} disabled={!rendered}>
            <Download className="w-3.5 h-3.5" />
            保存图片
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleCopyLink}>
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "已复制" : "复制链接"}
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={handleNativeShare} disabled={!rendered}>
            <Share2 className="w-3.5 h-3.5" />
            分享
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
