import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { BookOpen, Copy, Gift, GraduationCap, Plus, Share2, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/tennis/Navbar";
import { toast } from "sonner";

export default function CoachPromotion() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [newCoupon, setNewCoupon] = useState({ name: "", discountType: "fixed" as "fixed" | "percent", discountValue: "", minAmount: "", maxUses: "" });
  const [pkuDiscount, setPkuDiscount] = useState<string>("");
  const [newPkg, setNewPkg] = useState({ name: "", totalLessons: "", price: "", originalPrice: "", description: "" });

  const { data: profileData } = trpc.coach.myProfile.useQuery(undefined, { enabled: isAuthenticated });
  const { data: coupons } = trpc.coach.coupons.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myPackages, refetch: refetchPackages } = trpc.coach.myPackages.useQuery(undefined, { enabled: isAuthenticated });

  const createCoupon = trpc.coach.createCoupon.useMutation({
    onSuccess: () => {
      toast.success("\u4f18\u60e0\u5238\u5df2\u521b\u5efa");
      utils.coach.coupons.invalidate();
      setNewCoupon({ name: "", discountType: "fixed", discountValue: "", minAmount: "", maxUses: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const setPkuDiscountMutation = trpc.coach.setPkuDiscount.useMutation({
    onSuccess: () => { toast.success("\u5317\u5927\u6821\u53cb\u6298\u6263\u5df2\u4fdd\u5b58"); utils.coach.myProfile.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const createPackageMutation = trpc.coach.createPackage.useMutation({
    onSuccess: () => {
      toast.success("\u8bfe\u65f6\u5305\u5df2\u521b\u5efa");
      refetchPackages();
      setNewPkg({ name: "", totalLessons: "", price: "", originalPrice: "", description: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePackageMutation = trpc.coach.deletePackage.useMutation({
    onSuccess: () => { toast.success("\u8bfe\u65f6\u5305\u5df2\u5220\u9664"); refetchPackages(); },
    onError: (e) => toast.error(e.message),
  });

  const profile = profileData?.profile;
  const shareUrl = profile?.shareSlug
    ? `${window.location.origin}/coach/${profile.shareSlug}`
    : `${window.location.origin}/coaches/${profile?.id}`;

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("\u5206\u4eab\u94fe\u63a5\u5df2\u590d\u5236");
  };

  const copyInviteCode = () => {
    if (profile?.inviteCode) {
      navigator.clipboard.writeText(profile.inviteCode);
      toast.success("\u9080\u8bf7\u7801\u5df2\u590d\u5236");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-2xl">
        <h1 className="font-serif text-3xl font-bold mb-6">\u63a8\u5e7f\u5de5\u5177</h1>

        {/* Share Link */}
        <div className="card-elegant p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Share2 className="w-5 h-5 text-primary" />
            <h2 className="font-serif text-xl font-semibold">\u4e2a\u4eba\u5206\u4eab\u9875</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            \u5206\u4eab\u60a8\u7684\u4e13\u5c5e\u9875\u9762\uff0c\u5b66\u5458\u53ef\u76f4\u63a5\u67e5\u770b\u60a8\u7684\u8d44\u6599\u5e76\u9884\u7ea6\u8bfe\u7a0b
          </p>
          <div className="flex gap-2">
            <Input value={shareUrl} readOnly className="flex-1 text-sm bg-muted/50" />
            <Button onClick={copyShareUrl} variant="outline">
              <Copy className="w-4 h-4 mr-1.5" />
              \u590d\u5236
            </Button>
          </div>
        </div>

        {/* Invite Code */}
        <div className="card-elegant p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-primary" />
            <h2 className="font-serif text-xl font-semibold">\u9080\u8bf7\u7801</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            \u5b66\u5458\u4f7f\u7528\u9080\u8bf7\u7801\u9884\u7ea6\uff0c\u53ef\u4eab\u53d7\u9996\u8bfe\u4f18\u60e0\uff0c\u63d0\u5347\u8f6c\u5316\u7387
          </p>
          {profile?.inviteCode ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                <div className="font-mono font-bold text-2xl text-primary tracking-widest">{profile.inviteCode}</div>
              </div>
              <Button onClick={copyInviteCode} variant="outline" className="h-14">
                <Copy className="w-4 h-4 mr-1.5" />
                \u590d\u5236
              </Button>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">\u9080\u8bf7\u7801\u751f\u6210\u4e2d...</div>
          )}
        </div>

        {/* PKU Alumni Discount */}
        <div className="card-elegant p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-red-600" />
            <h2 className="font-serif text-xl font-semibold">\u5317\u5927\u6821\u53cb\u4e13\u5c5e\u6298\u6263</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            \u8bbe\u7f6e\u5bf9\u5df2\u8ba4\u8bc1\u5317\u5927\u6821\u53cb\u7684\u4e13\u5c5e\u4f18\u60e0\u3002\u8bbe\u4e3a 0 \u8868\u793a\u4e0d\u63d0\u4f9b\u6298\u6263\u3002\u793a\u4f8b\uff1a90 = 9\u6298\uff0c85 = 8.5\u6298\u3002
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs mb-1 block">\u6298\u6263\u529b\u5ea6\uff08\u8f93\u5165 0-99\uff0c\u5982 90 \u8868\u793a 9 \u6298\uff09</Label>
              <Input
                type="number"
                min={0}
                max={99}
                placeholder={`\u5f53\u524d\uff1a${profile?.pkuDiscount ?? 0}\uff08${profile?.pkuDiscount ? `${profile.pkuDiscount / 10}\u6298` : "\u4e0d\u6298\u6263"}\uff09`}
                value={pkuDiscount}
                onChange={(e) => setPkuDiscount(e.target.value)}
                className="h-9"
              />
            </div>
            <Button
              className="h-9"
              onClick={() => setPkuDiscountMutation.mutate({ pkuDiscount: parseInt(pkuDiscount) || 0 })}
              disabled={setPkuDiscountMutation.isPending}
            >
              \u4fdd\u5b58
            </Button>
          </div>
          {profile?.pkuDiscount && profile.pkuDiscount > 0 ? (
            <p className="text-xs text-green-600 mt-2">\u5f53\u524d\u5df2\u5f00\u542f\u5317\u5927\u6821\u53cb {profile.pkuDiscount / 10} \u6298\u4f18\u60e0</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">\u5f53\u524d\u672a\u5f00\u542f\u5317\u5927\u6821\u53cb\u4f18\u60e0</p>
          )}
        </div>

        {/* Lesson Packages */}
        <div className="card-elegant p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-serif text-xl font-semibold">\u8bfe\u65f6\u5305\u7ba1\u7406</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            \u521b\u5efa\u591a\u8282\u8bfe\u5957\u9910\uff0c\u5b66\u5458\u4e00\u6b21\u6027\u8d2d\u4e70\u591a\u8282\u8bfe\u53ef\u4eab\u53d7\u6279\u91cf\u4f18\u60e0\u3002\u6bcf\u6b21\u4e0a\u8bfe\u540e\u60a8\u786e\u8ba4\u5373\u81ea\u52a8\u6263\u51cf\u8bfe\u65f6\u3002
          </p>

          {/* Create Package */}
          <div className="bg-muted/50 rounded-xl p-4 mb-5">
            <h3 className="font-medium text-sm mb-3">\u521b\u5efa\u65b0\u8bfe\u65f6\u5305</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1 block">\u5957\u9910\u540d\u79f0 *</Label>
                <Input placeholder="\u5982\uff1a10\u8282\u8bfe\u5957\u9910" value={newPkg.name} onChange={e => setNewPkg(f => ({ ...f, name: e.target.value }))} className="h-9" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">\u8bfe\u65f6\u6570 *</Label>
                  <Input type="number" min={1} max={100} placeholder="10" value={newPkg.totalLessons} onChange={e => setNewPkg(f => ({ ...f, totalLessons: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">\u5957\u9910\u4ef7\u683c(\u5143) *</Label>
                  <Input type="number" placeholder="4500" value={newPkg.price} onChange={e => setNewPkg(f => ({ ...f, price: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">\u539f\u4ef7(\u5143)</Label>
                  <Input type="number" placeholder="5000" value={newPkg.originalPrice} onChange={e => setNewPkg(f => ({ ...f, originalPrice: e.target.value }))} className="h-9" />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">\u5957\u9910\u8bf4\u660e</Label>
                <Input placeholder="\u5957\u9910\u8be6\u60c5\u8bf4\u660e\uff08\u53ef\u9009\uff09" value={newPkg.description} onChange={e => setNewPkg(f => ({ ...f, description: e.target.value }))} className="h-9" />
              </div>
              <Button
                className="w-full h-9"
                onClick={() => createPackageMutation.mutate({
                  name: newPkg.name,
                  totalLessons: parseInt(newPkg.totalLessons) || 1,
                  price: newPkg.price,
                  originalPrice: newPkg.originalPrice || undefined,
                  description: newPkg.description || undefined,
                })}
                disabled={!newPkg.name || !newPkg.totalLessons || !newPkg.price || createPackageMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                \u521b\u5efa\u8bfe\u65f6\u5305
              </Button>
            </div>
          </div>

          {/* Package List */}
          {myPackages && myPackages.length > 0 ? (
            <div className="space-y-2">
              {myPackages.map((pkg: any) => (
                <div key={pkg.id} className="flex items-center justify-between p-3 rounded-lg border border-border/60">
                  <div>
                    <div className="font-medium text-sm">{pkg.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {pkg.totalLessons}\u8282\u8bfe &middot; \u5957\u9910\u4ef7 &yen;{pkg.price}
                      {pkg.originalPrice && <span className="line-through ml-1 opacity-60">&yen;{pkg.originalPrice}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={pkg.isActive ? "default" : "secondary"} className="text-xs">
                      {pkg.isActive ? "\u5df2\u4e0a\u67b6" : "\u5df2\u4e0b\u67b6"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-red-500 hover:text-red-600"
                      onClick={() => deletePackageMutation.mutate({ packageId: pkg.id })}
                      disabled={deletePackageMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <BookOpen className="w-8 h-8 mx-auto mb-2" />
              \u6682\u65e0\u8bfe\u65f6\u5305\uff0c\u521b\u5efa\u7b2c\u4e00\u4e2a\u5427
            </div>
          )}
        </div>

        {/* Coupons */}
        <div className="card-elegant p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-primary" />
            <h2 className="font-serif text-xl font-semibold">\u4f18\u60e0\u5238\u7ba1\u7406</h2>
          </div>

          {/* Create Coupon */}
          <div className="bg-muted/50 rounded-xl p-4 mb-5">
            <h3 className="font-medium text-sm mb-3">\u521b\u5efa\u65b0\u4f18\u60e0\u5238</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1 block">\u4f18\u60e0\u5238\u540d\u79f0</Label>
                <Input
                  placeholder="\u5982\uff1a\u9996\u8bfe\u4f18\u60e0"
                  value={newCoupon.name}
                  onChange={e => setNewCoupon(f => ({ ...f, name: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">\u4f18\u60e0\u7c7b\u578b</Label>
                  <select
                    value={newCoupon.discountType}
                    onChange={e => setNewCoupon(f => ({ ...f, discountType: e.target.value as "fixed" | "percent" }))}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="fixed">\u56fa\u5b9a\u51cf\u514d\uff08\u5143\uff09</option>
                    <option value="percent">\u6298\u6263\uff08%\uff09</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">{newCoupon.discountType === "fixed" ? "\u51cf\u514d\u91d1\u989d\uff08\u5143\uff09" : "\u6298\u6263\u529b\u5ea6\uff08%\uff09"}</Label>
                  <Input
                    placeholder={newCoupon.discountType === "fixed" ? "100" : "20"}
                    value={newCoupon.discountValue}
                    onChange={e => setNewCoupon(f => ({ ...f, discountValue: e.target.value }))}
                    type="number"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">\u6700\u4f4e\u6d88\u8d39\uff08\u5143\uff09</Label>
                  <Input
                    placeholder="500"
                    value={newCoupon.minAmount}
                    onChange={e => setNewCoupon(f => ({ ...f, minAmount: e.target.value }))}
                    type="number"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">\u4f7f\u7528\u6b21\u6570\u4e0a\u9650</Label>
                  <Input
                    placeholder="10"
                    value={newCoupon.maxUses}
                    onChange={e => setNewCoupon(f => ({ ...f, maxUses: e.target.value }))}
                    type="number"
                    className="h-9"
                  />
                </div>
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground h-9"
                onClick={() => createCoupon.mutate({
                  name: newCoupon.name,
                  type: newCoupon.discountType,
                  discountValue: newCoupon.discountValue,
                  minOrderAmount: newCoupon.minAmount || "0",
                  maxUsageCount: parseInt(newCoupon.maxUses) || 100,
                })}
                disabled={!newCoupon.name || !newCoupon.discountValue || createCoupon.isPending}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                \u521b\u5efa\u4f18\u60e0\u5238
              </Button>
            </div>
          </div>

          {/* Coupon List */}
          {coupons && coupons.length > 0 ? (
            <div className="space-y-2">
              {coupons.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border/60">
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.type === "fixed" ? `\u51cf \u00a5${c.discountValue}` : `${c.discountValue}% \u6298\u6263`}
                      {c.minOrderAmount && parseFloat(c.minOrderAmount) > 0 && ` \u00b7 \u6ee1 \u00a5${c.minOrderAmount} \u53ef\u7528`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold text-primary">{c.code}</div>
                    <div className="text-xs text-muted-foreground">{c.usedCount}/{c.maxUsageCount} \u6b21</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Gift className="w-8 h-8 mx-auto mb-2" />
              \u6682\u65e0\u4f18\u60e0\u5238\uff0c\u521b\u5efa\u7b2c\u4e00\u5f20\u5427
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
