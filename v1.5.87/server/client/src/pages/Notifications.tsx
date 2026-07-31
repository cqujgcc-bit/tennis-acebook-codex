import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Bell, BellOff, Check, CheckCheck, Trash2,
  AlertTriangle, Calendar, CreditCard, Star,
  DollarSign, MessageSquare, Info, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/tennis/Navbar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FilterType = "all" | "unread" | "warning" | "booking" | "system";

const TYPE_CONFIG: Record<string, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  booking_created: {
    icon: <Calendar className="w-4 h-4" />,
    label: "预约",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-100",
  },
  booking_confirmed: {
    icon: <Check className="w-4 h-4" />,
    label: "预约确认",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-100",
  },
  booking_rejected: {
    icon: <Calendar className="w-4 h-4" />,
    label: "预约拒绝",
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-100",
  },
  booking_cancelled: {
    icon: <Calendar className="w-4 h-4" />,
    label: "预约取消",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-100",
  },
  lesson_reminder: {
    icon: <Clock className="w-4 h-4" />,
    label: "课程提醒",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-100",
  },
  payment_success: {
    icon: <CreditCard className="w-4 h-4" />,
    label: "支付",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-100",
  },
  review_received: {
    icon: <Star className="w-4 h-4" />,
    label: "评价",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-100",
  },
  settlement_completed: {
    icon: <DollarSign className="w-4 h-4" />,
    label: "结算",
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-100",
  },
  system: {
    icon: <Info className="w-4 h-4" />,
    label: "系统",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    label: "违规警告",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  coach_approved: {
    icon: <Check className="w-4 h-4" />,
    label: "审核通过",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-100",
  },
  coach_rejected: {
    icon: <MessageSquare className="w-4 h-4" />,
    label: "审核未通过",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-100",
  },
};

const DEFAULT_CONFIG = {
  icon: <Bell className="w-4 h-4" />,
  label: "通知",
  color: "text-gray-600",
  bgColor: "bg-gray-50",
  borderColor: "border-gray-200",
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? DEFAULT_CONFIG;
}

function isWarningType(type: string, title: string) {
  return type === "warning" || title.includes("警告") || title.includes("违规");
}

export default function Notifications() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: notifications, isLoading } = trpc.notification.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000, // refresh every 30s
  });

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });

  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
      toast.success("已全部标记为已读");
    },
  });

  const deleteNotif = trpc.notification.delete.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
    onError: () => toast.error("删除失败，请重试"),
  });

  const handleClickNotif = (id: number, isRead: boolean) => {
    if (!isRead) {
      markRead.mutate({ ids: [id] });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-3">请先登录</h2>
          <Button onClick={() => window.location.href = '/login'} className="bg-primary text-primary-foreground">
            立即登录
          </Button>
        </div>
      </div>
    );
  }

  const allNotifs = notifications ?? [];
  const unreadCount = allNotifs.filter(n => !n.isRead).length;
  const warningCount = allNotifs.filter(n => isWarningType(n.type, n.title)).length;

  const filtered = allNotifs.filter(n => {
    if (filter === "unread") return !n.isRead;
    if (filter === "warning") return isWarningType(n.type, n.title);
    if (filter === "booking") return n.type.startsWith("booking") || n.type === "lesson_reminder";
    if (filter === "system") return n.type === "system" || n.type === "payment_success" || n.type === "settlement_completed" || n.type === "review_received";
    return true;
  });

  const FILTERS: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "全部", count: allNotifs.length },
    { key: "unread", label: "未读", count: unreadCount },
    { key: "warning", label: "警告", count: warningCount },
    { key: "booking", label: "预约" },
    { key: "system", label: "系统" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl font-bold flex items-center gap-2">
              <Bell className="w-7 h-7 text-primary" />
              消息通知
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {unreadCount > 0 ? (
                <span className="text-primary font-medium">{unreadCount} 条未读</span>
              ) : (
                "所有消息已读"
              )}
              {" · "}共 {allNotifs.length} 条
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              全部已读
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                filter === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                  filter === f.key
                    ? "bg-white/20 text-white"
                    : f.key === "warning" ? "bg-red-100 text-red-600"
                    : f.key === "unread" ? "bg-primary/10 text-primary"
                    : "bg-background text-foreground"
                )}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notification List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BellOff className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {filter === "all" ? "暂无通知" : "该分类暂无通知"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const isWarn = isWarningType(n.type, n.title);
              const cfg = isWarn ? TYPE_CONFIG["warning"] : getTypeConfig(n.type);
              return (
                <div
                  key={n.id}
                  onClick={() => handleClickNotif(n.id, n.isRead)}
                  className={cn(
                    "group relative p-4 rounded-2xl border transition-all cursor-pointer",
                    !n.isRead
                      ? isWarn
                        ? "bg-red-50/60 border-red-200 shadow-sm"
                        : "bg-primary/3 border-primary/20 shadow-sm"
                      : "bg-card border-border/50 hover:border-border",
                    isWarn && "ring-1 ring-red-200"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                      cfg.bgColor, cfg.color
                    )}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "font-semibold text-sm",
                            !n.isRead ? "text-foreground" : "text-foreground/80"
                          )}>
                            {n.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-xs px-1.5 py-0 border", cfg.color, cfg.borderColor)}
                          >
                            {cfg.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!n.isRead && (
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              isWarn ? "bg-red-500" : "bg-primary"
                            )} />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotif.mutate({ id: n.id });
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className={cn(
                        "text-sm mt-1 leading-relaxed",
                        isWarn ? "text-red-700" : "text-muted-foreground"
                      )}>
                        {n.content}
                      </p>
                      <div className="text-xs text-muted-foreground/60 mt-1.5">
                        {new Date(n.createdAt).toLocaleString("zh-CN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
