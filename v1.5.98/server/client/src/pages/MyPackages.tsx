import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/tennis/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Clock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "待支付", color: "bg-yellow-100 text-yellow-700" },
  active: { label: "使用中", color: "bg-green-100 text-green-700" },
  exhausted: { label: "已用完", color: "bg-gray-100 text-gray-500" },
  refund_requested: { label: "退款中", color: "bg-orange-100 text-orange-700" },
  refunded: { label: "已退款", color: "bg-red-100 text-red-600" },
};

export default function MyPackages() {
  const { isAuthenticated } = useAuth();
  const [refundPkg, setRefundPkg] = useState<any>(null);
  const [refundNote, setRefundNote] = useState("");

  const { data: packages, isLoading, refetch } = trpc.package.myPackages.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const refundMutation = trpc.package.requestRefund.useMutation({
    onSuccess: () => {
      toast.success("退款申请已提交，请等待教练处理");
      setRefundPkg(null);
      setRefundNote("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground mb-4">请先登录查看课时包</p>
          <Button onClick={() => window.location.href = getLoginUrl()}>立即登录</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          我的课时包
        </h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : !packages || packages.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-lg font-medium">暂无课时包</p>
            <p className="text-muted-foreground text-sm mt-1">在教练详情页购买课时包，享受批量优惠</p>
          </div>
        ) : (
          <div className="space-y-4">
            {packages.map((pkg: any) => {
              const statusInfo = STATUS_LABELS[pkg.status] ?? { label: pkg.status, color: "bg-gray-100 text-gray-500" };
              const progressPct = pkg.totalLessons > 0 ? ((pkg.totalLessons - pkg.remainingLessons) / pkg.totalLessons) * 100 : 0;
              return (
                <Card key={pkg.id} className="border border-border/60">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{pkg.packageName ?? "课时包"}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">教练：{pkg.coachName ?? "未知"}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">课时进度</span>
                        <span className="font-medium">
                          已用 {pkg.totalLessons - pkg.remainingLessons} / {pkg.totalLessons} 节
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        剩余 <strong className="text-foreground">{pkg.remainingLessons}</strong> 节
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        实付：<strong className="text-foreground">¥{pkg.pricePaid}</strong>
                        {pkg.paidAt && (
                          <span className="ml-2 text-xs">
                            <Clock className="w-3 h-3 inline mr-0.5" />
                            {new Date(pkg.paidAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {(pkg.status === "active" || pkg.status === "pending_payment") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => setRefundPkg(pkg)}
                        >
                          <RotateCcw className="w-3 h-3" />
                          申请退款
                        </Button>
                      )}
                    </div>

                    {/* Deduction history */}
                    {pkg.deductions && pkg.deductions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-2">扣课记录</p>
                        <div className="space-y-1">
                          {pkg.deductions.slice(0, 3).map((d: any) => (
                            <div key={d.id} className="text-xs text-muted-foreground flex justify-between">
                              <span>{d.note ?? "完成一节课"}</span>
                              <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                            </div>
                          ))}
                          {pkg.deductions.length > 3 && (
                            <p className="text-xs text-muted-foreground">...共 {pkg.deductions.length} 条记录</p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Refund Dialog */}
      <Dialog open={!!refundPkg} onOpenChange={(open) => !open && setRefundPkg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>申请退款</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              课时包「{refundPkg?.packageName}」剩余 {refundPkg?.remainingLessons} 节课，退款金额由您与教练协商确定。
            </p>
            <div>
              <Label>退款说明（可选）</Label>
              <Textarea
                className="mt-1"
                placeholder="请说明退款原因..."
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundPkg(null)}>取消</Button>
            <Button
              onClick={() => refundMutation.mutate({ studentPackageId: refundPkg.id, note: refundNote })}
              disabled={refundMutation.isPending}
            >
              提交退款申请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
