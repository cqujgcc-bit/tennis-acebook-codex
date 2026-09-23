import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, ChevronDown } from "lucide-react";

// ─── Phone tab sub-modes ──────────────────────────────────────────────────────
type PhoneMode = "sms_login" | "password_login" | "password_register";

export default function Login() {
  const [, navigate] = useLocation();
  const returnPath = new URLSearchParams(window.location.search).get("return") || "/";

  // ── Shared phone state ───────────────────────────────────────────────────────
  const [phone, setPhone] = useState("");
  const [phoneMode, setPhoneMode] = useState<PhoneMode>("sms_login");

  // ── SMS code state ───────────────────────────────────────────────────────────
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Password state ───────────────────────────────────────────────────────────
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 微信登录弹窗
  const [showWechatTip, setShowWechatTip] = useState(false);

  // ── Email tab state ──────────────────────────────────────────────────────────────────────────────
  const [emailMode, setEmailMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailConfirmPassword, setEmailConfirmPassword] = useState("");
  const [emailDisplayName, setEmailDisplayName] = useState("");
  const [emailPhone, setEmailPhone] = useState("");
  const [emailWechatId, setEmailWechatId] = useState("");
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);

  // Check if already logged in
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (meQuery.data) navigate(returnPath);
  }, [meQuery.data, returnPath, navigate]);

  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const sendCodeMutation = trpc.auth.sendSmsCode.useMutation({
    onSuccess: () => {
      setCountdown(60);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { if (countdownRef.current) clearInterval(countdownRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
      toast.success("验证码已发送，请注意查收");
    },
    onError: (err) => toast.error(err.message || "发送失败，请稍后重试"),
  });

  const loginPhoneMutation = trpc.auth.loginWithPhone.useMutation({
    onSuccess: () => {
      toast.success("登录成功！");
      setTimeout(() => { window.location.href = returnPath; }, 500);
    },
    onError: (err) => toast.error(err.message || "登录失败，请重试"),
  });

  const loginPasswordMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: () => {
      toast.success("登录成功！");
      setTimeout(() => { window.location.href = returnPath; }, 500);
    },
    onError: (err) => toast.error(err.message || "手机号或密码错误"),
  });

  const registerPhoneMutation = trpc.auth.registerWithPhone.useMutation({
    onSuccess: () => {
      toast.success("注册成功！");
      setTimeout(() => { window.location.href = returnPath; }, 500);
    },
    onError: (err) => toast.error(err.message || "注册失败，请重试"),
  });

  const loginEmailMutation = trpc.auth.loginWithEmail.useMutation({
    onSuccess: () => {
      toast.success("登录成功！");
      setTimeout(() => { window.location.href = returnPath; }, 500);
    },
    onError: (err) => toast.error(err.message || "邮箱或密码错误"),
  });

  const registerEmailMutation = trpc.auth.registerWithEmail.useMutation({
    onSuccess: () => {
      toast.success("注册成功！");
      setTimeout(() => { window.location.href = returnPath; }, 500);
    },
    onError: (err) => toast.error(err.message || "注册失败，请重试"),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSendCode = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) { toast.error("请输入正确的手机号"); return; }
    sendCodeMutation.mutate({ phone });
  };

  const handlePhoneSubmit = () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) { toast.error("请输入正确的手机号"); return; }

    if (phoneMode === "sms_login") {
      if (code.length !== 6) { toast.error("请输入6位验证码"); return; }
      loginPhoneMutation.mutate({ phone, code });
    } else if (phoneMode === "password_login") {
      if (!password) { toast.error("请输入密码"); return; }
      loginPasswordMutation.mutate({ phone, password });
    } else {
      // password_register
      if (code.length !== 6) { toast.error("请输入6位验证码"); return; }
      if (password.length < 8) { toast.error("密码至少8位"); return; }
      if (password !== confirmPassword) { toast.error("两次密码不一致"); return; }
      registerPhoneMutation.mutate({ phone, password, name: displayName || undefined, code });
    }
  };

  const handleEmailSubmit = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("请输入正确的邮箱地址"); return;
    }
    if (emailMode === "login") {
      if (!emailPassword) { toast.error("请输入密码"); return; }
      loginEmailMutation.mutate({ email, password: emailPassword });
    } else {
      if (emailPassword.length < 8) { toast.error("密码至少8位"); return; }
      if (emailPassword !== emailConfirmPassword) { toast.error("两次密码不一致"); return; }
      const phoneClean = emailPhone.trim();
      const wechatClean = emailWechatId.trim();
      if (phoneClean && !/^1[3-9]\d{9}$/.test(phoneClean)) {
        toast.error("请输入正确的手机号"); return;
      }
      registerEmailMutation.mutate({
        email,
        password: emailPassword,
        name: emailDisplayName || undefined,
        phone: phoneClean || undefined,
        wechatId: wechatClean || undefined,
      });
    }
  };

  const isPhonePending =
    loginPhoneMutation.isPending ||
    loginPasswordMutation.isPending ||
    registerPhoneMutation.isPending;

  const phoneModeLabel: Record<PhoneMode, string> = {
    sms_login: "验证码登录",
    password_login: "密码登录",
    password_register: "注册新账号",
  };

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 border-b border-border/50">
        <a href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-serif font-bold text-sm">T</span>
          </div>
          <span className="font-serif font-semibold text-foreground text-lg">AceBook</span>
        </a>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">
              {phoneMode === "password_register" ? "创建账号" : "欢迎回来"}
            </h1>
            <p className="text-muted-foreground text-sm">全国网球约球平台</p>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-elegant)] p-6">
            <Tabs defaultValue="phone">
              <TabsList className="w-full mb-5">
                <TabsTrigger value="phone" className="flex-1">手机号</TabsTrigger>
                <TabsTrigger value="email" className="flex-1">邮箱</TabsTrigger>
              </TabsList>

              {/* ── Phone Tab ─────────────────────────────────────────────── */}
              <TabsContent value="phone" className="space-y-4 mt-0">
                {/* Mode selector */}
                <div className="flex rounded-lg bg-muted p-1 gap-1">
                  {(["sms_login", "password_login", "password_register"] as PhoneMode[]).map(m => (
                    <button
                      key={m}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${phoneMode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      onClick={() => { setPhoneMode(m); setCode(""); setPassword(""); setConfirmPassword(""); }}
                    >
                      {phoneModeLabel[m]}
                    </button>
                  ))}
                </div>

                {/* Phone input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">手机号</label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 bg-muted rounded-lg border border-border text-muted-foreground text-sm shrink-0 select-none">
                      +86
                    </div>
                    <Input
                      type="tel"
                      placeholder="请输入手机号"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Name field (register only) */}
                {phoneMode === "password_register" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">姓名 <span className="text-muted-foreground font-normal">（选填）</span></label>
                    <Input
                      type="text"
                      placeholder="您的姓名"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                    />
                  </div>
                )}

                {/* SMS Code (sms_login & password_register) */}
                {(phoneMode === "sms_login" || phoneMode === "password_register") && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">验证码</label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="6位验证码"
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onKeyDown={e => e.key === "Enter" && phoneMode === "sms_login" && handlePhoneSubmit()}
                        className="flex-1 font-mono tracking-widest"
                        maxLength={6}
                      />
                      <Button
                        variant="outline"
                        className="shrink-0 min-w-[100px] text-sm"
                        onClick={handleSendCode}
                        disabled={sendCodeMutation.isPending || countdown > 0 || phone.length !== 11}
                      >
                        {sendCodeMutation.isPending
                          ? <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          : countdown > 0
                            ? `${countdown}s 后重发`
                            : "获取验证码"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Password (password_login & password_register) */}
                {(phoneMode === "password_login" || phoneMode === "password_register") && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      密码
                      {phoneMode === "password_register" && <span className="text-muted-foreground font-normal ml-1">（至少8位）</span>}
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={phoneMode === "password_register" ? "设置登录密码（至少8位）" : "请输入密码"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && phoneMode === "password_login" && handlePhoneSubmit()}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirm password (register only) */}
                {phoneMode === "password_register" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">确认密码</label>
                    <div className="relative">
                      <Input
                        type={showConfirm ? "text" : "password"}
                        placeholder="再次输入密码"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handlePhoneSubmit()}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowConfirm(!showConfirm)}
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-base font-medium mt-1"
                  onClick={handlePhoneSubmit}
                  disabled={isPhonePending || phone.length !== 11}
                >
                  {isPhonePending
                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />处理中...</span>
                    : phoneMode === "sms_login"
                      ? "登录 / 注册"
                      : phoneMode === "password_login"
                        ? "登录"
                        : "注册"}
                </Button>

                {phoneMode === "sms_login" && (
                  <p className="text-xs text-muted-foreground text-center">
                    未注册的手机号将自动创建账号
                  </p>
                )}
              </TabsContent>

              {/* ── Email Tab ─────────────────────────────────────────────── */}
              <TabsContent value="email" className="space-y-4 mt-0">
                <div className="flex rounded-lg bg-muted p-1 gap-1">
                  <button
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${emailMode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setEmailMode("login")}
                  >
                    登录
                  </button>
                  <button
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${emailMode === "register" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setEmailMode("register")}
                  >
                    注册
                  </button>
                </div>

                {emailMode === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">姓名 <span className="text-muted-foreground font-normal">（选填）</span></label>
                    <Input
                      type="text"
                      placeholder="您的姓名"
                      value={emailDisplayName}
                      onChange={e => setEmailDisplayName(e.target.value)}
                    />
                  </div>
                )}

                {emailMode === "register" && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-xl border border-border/60">
                    <p className="text-xs font-medium text-foreground">
                      联系方式 <span className="text-destructive">*</span>
                      <span className="text-muted-foreground font-normal ml-1">（手机号或微信号，至少填一项）</span>
                    </p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex items-center px-3 bg-background rounded-lg border border-border text-muted-foreground text-sm shrink-0 select-none">
                          +86
                        </div>
                        <Input
                          type="tel"
                          placeholder="手机号（选填）"
                          value={emailPhone}
                          onChange={e => setEmailPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                          className="flex-1 bg-background"
                        />
                      </div>
                      <Input
                        type="text"
                        placeholder="微信号（选填）"
                        value={emailWechatId}
                        onChange={e => setEmailWechatId(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">联系方式仅对您参与的球局成员可见，用于球友联系您</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">邮箱</label>
                  <Input
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    密码
                    {emailMode === "register" && <span className="text-muted-foreground font-normal ml-1">（至少8位）</span>}
                  </label>
                  <div className="relative">
                    <Input
                      type={showEmailPassword ? "text" : "password"}
                      placeholder={emailMode === "register" ? "设置密码（至少8位）" : "请输入密码"}
                      value={emailPassword}
                      onChange={e => setEmailPassword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && emailMode === "login" && handleEmailSubmit()}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowEmailPassword(!showEmailPassword)}
                    >
                      {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {emailMode === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">确认密码</label>
                    <div className="relative">
                      <Input
                        type={showEmailConfirm ? "text" : "password"}
                        placeholder="再次输入密码"
                        value={emailConfirmPassword}
                        onChange={e => setEmailConfirmPassword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleEmailSubmit()}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowEmailConfirm(!showEmailConfirm)}
                      >
                        {showEmailConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-base font-medium"
                  onClick={handleEmailSubmit}
                  disabled={loginEmailMutation.isPending || registerEmailMutation.isPending}
                >
                  {(loginEmailMutation.isPending || registerEmailMutation.isPending)
                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />{emailMode === "login" ? "登录中..." : "注册中..."}</span>
                    : emailMode === "login" ? "登录" : "注册"}
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          {/* 微信登录入口 */}
          <div className="mt-4">
            <div className="relative flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground shrink-0">其他登录方式</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <button
              onClick={() => setShowWechatTip(true)}
              className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl border border-[#07C160]/40 bg-[#07C160]/5 text-[#07C160] hover:bg-[#07C160]/10 active:scale-[0.98] transition-all text-sm font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.063-6.122zm-3.494 3.033c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.943 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
              </svg>
              微信登录
            </button>
          </div>

          {/* 微信登录说明弹窗 */}
          {showWechatTip && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50" onClick={() => setShowWechatTip(false)}>
              <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#07C160]/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#07C160]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.063-6.122zm-3.494 3.033c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.943 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">微信登录</h3>
                    <p className="text-xs text-muted-foreground">AceBook 小程序</p>
                  </div>
                </div>
                <div className="space-y-3 mb-5">
                  <p className="text-sm text-foreground">微信登录需在《AceBook》小程序内使用，小程序内可直接用微信身份一键登录。</p>
                  <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-medium text-foreground">如何使用小程序：</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>微信搜索《AceBook》</li>
                      <li>点击「登录 / 注册」</li>
                      <li>选择「微信登录」即可一键登录</li>
                    </ol>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowWechatTip(false)}>知道了</Button>
                  <Button className="flex-1 bg-[#07C160] hover:bg-[#07C160]/90 text-white" onClick={() => setShowWechatTip(false)}>去小程序登录</Button>
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground leading-relaxed">
            登录即表示您同意我们的
            <span className="text-primary cursor-pointer hover:underline mx-1">服务条款</span>
            和
            <span className="text-primary cursor-pointer hover:underline mx-1">隐私政策</span>
          </p>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-muted-foreground border-t border-border/50">
        © 2025 AceBook · 全国网球约球平台
      </footer>
    </div>
  );
}
