import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Bell, ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: unreadData } = trpc.notification.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count ?? 0;

  const isCoach = user?.role === "coach";
  const isAdmin = user?.role === "admin";
  const isCoachOrAdmin = isCoach || isAdmin;

  const handleVenueClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.info("功能开发中，敬请期待");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/50">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-black text-sm leading-none">A</span>
              </div>
              <span className="font-black text-xl tracking-tight text-foreground group-hover:text-primary transition-colors">
                AceBook
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {/* 约球：排在第一位 */}
            <NavLink href="/matches" active={location.startsWith("/matches")}>
              约球
            </NavLink>

            {/* 找教练：仅学员和管理员可见，教练本人不显示 */}
            {(!isCoach || isAdmin) && (
              <NavLink href="/coaches" active={location.startsWith("/coaches")}>
                找教练
              </NavLink>
            )}

            {/* 场地信息：点击提示开发中 */}
            <button
              onClick={handleVenueClick}
              className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              场地信息
            </button>

            {isAuthenticated && (
              <NavLink href="/my-bookings" active={location === "/my-bookings"}>
                {isCoachOrAdmin ? "我的课程" : "我的预约"}
              </NavLink>
            )}
            {isCoachOrAdmin && (
              <NavLink href="/coach-dashboard" active={location.startsWith("/coach")}>
                教练工作台
              </NavLink>
            )}
            {isAdmin && (
              <NavLink href="/admin" active={location === "/admin"}>
                管理后台
              </NavLink>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <Link href="/notifications">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-muted transition-colors">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={user?.avatar ?? undefined} />
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {user?.name?.charAt(0) ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium hidden sm:block max-w-[80px] truncate">
                        {user?.name ?? "用户"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/my-bookings">
                        {isCoachOrAdmin ? "我的课程" : "我的预约"}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/notifications">消息通知</Link>
                    </DropdownMenuItem>
                    {isCoachOrAdmin ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/coach-dashboard">教练工作台</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/coach-profile">编辑档案</Link>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/matches">约球</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/my-packages">我的课时包</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/profile">个人设置</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/become-coach">申请成为教练</Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin">管理后台</Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()} className="text-red-600">
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                onClick={() => window.location.href = '/login'}
              >
                登录 / 注册
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-white animate-fade-in">
          <nav className="container py-3 flex flex-col gap-1">
            {/* 约球：排在第一位 */}
            <MobileNavLink href="/matches" onClick={() => setMobileOpen(false)}>约球</MobileNavLink>
            {/* 找教练：教练本人不显示 */}
            {!isCoach && (
              <MobileNavLink href="/coaches" onClick={() => setMobileOpen(false)}>找教练</MobileNavLink>
            )}
            {/* 场地信息：点击提示开发中 */}
            <button
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
              onClick={() => { setMobileOpen(false); toast.info("功能开发中，敬请期待"); }}
            >
              场地信息
            </button>
            {isAuthenticated && (
              <MobileNavLink href="/my-bookings" onClick={() => setMobileOpen(false)}>
                {isCoachOrAdmin ? "我的课程" : "我的预约"}
              </MobileNavLink>
            )}
            {isCoachOrAdmin && (
              <MobileNavLink href="/coach-dashboard" onClick={() => setMobileOpen(false)}>教练工作台</MobileNavLink>
            )}
            {isAdmin && (
              <MobileNavLink href="/admin" onClick={() => setMobileOpen(false)}>管理后台</MobileNavLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href}>
      <span className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}>
        {children}
      </span>
    </Link>
  );
}

function MobileNavLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href}>
      <span
        className="block px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
        onClick={onClick}
      >
        {children}
      </span>
    </Link>
  );
}
