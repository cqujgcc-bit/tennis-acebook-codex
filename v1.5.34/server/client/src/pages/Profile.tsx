import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/tennis/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, GraduationCap, User, Phone, MessageCircle, Pencil, Star, TrendingUp, Clock, Heart, Target } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function Profile() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [pkuForm, setPkuForm] = useState({
    year: "",
    school: "",
    studentId: "",
    note: "",
  });

  const [contactForm, setContactForm] = useState({
    phone: (user as any)?.phone ?? "",
    wechatId: (user as any)?.wechatId ?? "",
  });
  const [editingContact, setEditingContact] = useState(false);
  const [editingNtrp, setEditingNtrp] = useState(false);
  const [ntrpValue, setNtrpValue] = useState<string>((user as any)?.ntrpLevel ? String((user as any).ntrpLevel) : "");

  const updateNtrpMutation = trpc.user.updateNtrpLevel.useMutation({
    onSuccess: () => {
      toast.success("NTRP 水平已更新");
      utils.auth.me.invalidate();
      setEditingNtrp(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateContactMutation = trpc.user.updateContact.useMutation({
    onSuccess: () => {
      toast.success("联系方式已更新");
      utils.auth.me.invalidate();
      setEditingContact(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const applyPkuMutation = trpc.user.applyPkuAlumni.useMutation({
    onSuccess: () => {
      toast.success("北大校友认证已提交！");
      utils.auth.me.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const revokePkuMutation = trpc.user.revokePkuAlumni.useMutation({
    onSuccess: () => {
      toast.success("已取消北大校友认证");
      utils.auth.me.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground mb-4">请先登录查看个人设置</p>
          <Button onClick={() => window.location.href = getLoginUrl()}>立即登录</Button>
        </div>
      </div>
    );
  }

  const isPku = (user as any).pkuAlumni === true;
  const pkuInfo = (user as any).pkuInfo as any;
  const ntrpLevel = (user as any)?.ntrpLevel ? Number((user as any).ntrpLevel) : null;
  const creditScore = (user as any)?.creditScore ? Number((user as any).creditScore) : 100;
  const userId = (user as any)?.id;
  const myReviews = trpc.match.getUserReviews.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  const NTRP_LABELS: Record<string, string> = {
    "1.0": "1.0 - 完全初学", "1.5": "1.5 - 初学者", "2.0": "2.0 - 入门级",
    "2.5": "2.5 - 初级", "3.0": "3.0 - 初中级", "3.5": "3.5 - 中级",
    "4.0": "4.0 - 中高级", "4.5": "4.5 - 高级", "5.0": "5.0 - 竞技级",
    "5.5": "5.5 - 精英级", "6.0": "6.0 - 职业级",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container py-8 max-w-xl">
        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          个人设置
        </h1>

        {/* Basic Info */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">基本信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user.avatar ?? undefined} />
                <AvatarFallback className="text-xl">{user.name?.charAt(0) ?? "U"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.phone ?? "未绑定手机"}</p>
                <div className="flex gap-2 mt-1">
                  {isPku && (
                    <Badge className="bg-red-600 text-white text-xs gap-1">
                      <GraduationCap className="w-3 h-3" />
                      北大校友
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs capitalize">{user.role}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NTRP 水平 + 信用分 */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                球技水平 &amp; 信用分
              </CardTitle>
              {!editingNtrp && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setNtrpValue(ntrpLevel ? String(ntrpLevel) : "");
                  setEditingNtrp(true);
                }}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />编辑
                </Button>
              )}
            </div>
            <CardDescription>NTRP 水平用于匹配相近水平的球友，信用分基于其他球友对您的评价</CardDescription>
          </CardHeader>
          <CardContent>
            {editingNtrp ? (
              <div className="space-y-3">
                <div>
                  <Label>我的 NTRP 水平</Label>
                  <Select value={ntrpValue} onValueChange={setNtrpValue}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="请选择您的水平" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(NTRP_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  NTRP（1.0-6.0）是美国网球协会的标准水平体系，全球网球玩家普遍使用。
                  3.0-3.5 = 一般业余球友，4.0+ = 赛事级。
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (!ntrpValue) { toast.error("请选择您的水平"); return; }
                      updateNtrpMutation.mutate({ ntrpLevel: Number(ntrpValue) });
                    }}
                    disabled={updateNtrpMutation.isPending}
                  >保存</Button>
                  <Button variant="outline" onClick={() => setEditingNtrp(false)}>取消</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">NTRP 水平</p>
                    {ntrpLevel ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-2xl text-primary">{ntrpLevel.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">{NTRP_LABELS[String(ntrpLevel)]?.split(" - ")[1]}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-600">尚未设置，设置后可匹配相近水平的球友</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">信用分</p>
                    <div className="flex items-center gap-1 justify-end">
                      <Star className={`w-4 h-4 ${creditScore >= 80 ? "text-amber-400" : "text-gray-300"}`} fill={creditScore >= 80 ? "currentColor" : "none"} />
                      <span className={`font-bold text-xl ${creditScore >= 90 ? "text-green-600" : creditScore >= 70 ? "text-amber-600" : "text-red-600"}`}>
                        {creditScore}
                      </span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {creditScore >= 90 ? "信用优秀" : creditScore >= 70 ? "信用良好" : "信用需改善"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                联系方式
              </CardTitle>
              {!editingContact && (
                <Button variant="ghost" size="sm" onClick={() => {
                  setContactForm({ phone: (user as any)?.phone ?? "", wechatId: (user as any)?.wechatId ?? "" });
                  setEditingContact(true);
                }}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />编辑
                </Button>
              )}
            </div>
            <CardDescription>联系方式仅对您参与的球局成员可见，用于球友联系您</CardDescription>
          </CardHeader>
          <CardContent>
            {editingContact ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="contact-phone">手机号</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="flex items-center px-3 bg-muted rounded-md border border-border text-muted-foreground text-sm shrink-0">+86</div>
                    <Input
                      id="contact-phone"
                      type="tel"
                      placeholder="手机号（选填）"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="contact-wechat">微信号</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="flex items-center px-3 bg-muted rounded-md border border-border text-muted-foreground text-sm shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <Input
                      id="contact-wechat"
                      placeholder="微信号（选填）"
                      value={contactForm.wechatId}
                      onChange={(e) => setContactForm({ ...contactForm, wechatId: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">手机号和微信号至少填写一项</p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (!contactForm.phone.trim() && !contactForm.wechatId.trim()) {
                        toast.error("手机号和微信号至少填写一项"); return;
                      }
                      if (contactForm.phone && !/^1[3-9]\d{9}$/.test(contactForm.phone)) {
                        toast.error("请输入正确的手机号"); return;
                      }
                      updateContactMutation.mutate(contactForm);
                    }}
                    disabled={updateContactMutation.isPending}
                  >保存</Button>
                  <Button variant="outline" onClick={() => setEditingContact(false)}>取消</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className={(user as any)?.phone ? "text-foreground" : "text-muted-foreground"}>
                    {(user as any)?.phone ? `+86 ${(user as any).phone}` : "未绑定手机号"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MessageCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className={(user as any)?.wechatId ? "text-foreground" : "text-muted-foreground"}>
                    {(user as any)?.wechatId ? (user as any).wechatId : "未绑定微信号"}
                  </span>
                </div>
                {!(user as any)?.phone && !(user as any)?.wechatId && (
                  <p className="text-xs text-amber-600 mt-2">建议填写联系方式，方便球友找到您</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 评价历史 */}
        {userId && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                我的评价历史
              </CardTitle>
              <CardDescription>其他球友对您的评价记录，影响您的信用分</CardDescription>
            </CardHeader>
            <CardContent>
              {myReviews.isLoading ? (
                <p className="text-sm text-muted-foreground">加载中...</p>
              ) : !myReviews.data || myReviews.data.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无评价记录</p>
                  <p className="text-xs mt-1">参与球局后，其他球友可以对您进行评价</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myReviews.data.slice(0, 5).map((review: any) => (
                    <div key={review.id} className="p-3 bg-muted/40 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex gap-3 flex-1">
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span className="text-muted-foreground">准时</span>
                            <span className="font-medium">{review.punctualityScore}/5</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Heart className="w-3 h-3 text-rose-500" />
                            <span className="text-muted-foreground">友好</span>
                            <span className="font-medium">{review.friendlinessScore}/5</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Target className="w-3 h-3 text-green-500" />
                            <span className="text-muted-foreground">水平</span>
                            <span className="font-medium">{review.levelMatchScore}/5</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-xs text-foreground/80 mt-1 italic">"{review.comment}"</p>
                      )}
                    </div>
                  ))}
                  {myReviews.data.length > 5 && (
                    <p className="text-xs text-center text-muted-foreground pt-1">共 {myReviews.data.length} 条评价</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* PKU Alumni */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-red-600" />
              北大校友专属通道
            </CardTitle>
            <CardDescription>
              认证北大校友身份后，可享受教练提供的专属折扣优惠。认证信息仅用于享受优惠，平台不作其他用途。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPku ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <p className="font-medium text-green-700 text-sm">已认证北大校友</p>
                    {pkuInfo && (
                      <p className="text-xs text-green-600 mt-0.5">
                        {pkuInfo.year && `${pkuInfo.year}届`}
                        {pkuInfo.school && ` · ${pkuInfo.school}`}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  预约教练时，系统将自动显示您的校友身份，教练可根据其设置的折扣为您提供优惠价格。
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => revokePkuMutation.mutate()}
                  disabled={revokePkuMutation.isPending}
                >
                  取消校友认证
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  请填写您的北大校友信息，提交后即可享受教练提供的专属优惠。
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="pku-year">毕业年份</Label>
                    <Input
                      id="pku-year"
                      placeholder="例：2015"
                      value={pkuForm.year}
                      onChange={(e) => setPkuForm({ ...pkuForm, year: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pku-school">院系</Label>
                    <Input
                      id="pku-school"
                      placeholder="例：信息科学技术学院"
                      value={pkuForm.school}
                      onChange={(e) => setPkuForm({ ...pkuForm, school: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="pku-studentid">学号（可选）</Label>
                  <Input
                    id="pku-studentid"
                    placeholder="学号（可不填）"
                    value={pkuForm.studentId}
                    onChange={(e) => setPkuForm({ ...pkuForm, studentId: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pku-note">补充说明（可选）</Label>
                  <Input
                    id="pku-note"
                    placeholder="其他说明信息"
                    value={pkuForm.note}
                    onChange={(e) => setPkuForm({ ...pkuForm, note: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => applyPkuMutation.mutate(pkuForm)}
                  disabled={applyPkuMutation.isPending}
                >
                  提交校友认证
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
