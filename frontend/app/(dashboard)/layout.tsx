"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  LayoutDashboard,
  Boxes,
  ChefHat,
  BookOpen,
  ShoppingCart,
  DollarSign,
  Truck,
  BarChart3,
  Trash2,
  Users,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Plus,
  Calendar,
  User as UserIcon,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const logout = useAuthStore((state) => state.logout);
  const role = useAuthStore((state) => state.role);
  const userName = useAuthStore((state) => state.userName);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [currentDate, setCurrentDate] = useState("");

  // Hydrate auth store
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Set formatted current date
  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "short",
      day: "numeric",
    };

    setCurrentDate(new Date().toLocaleDateString("en-US", options));
  }, []);

  // Authenticate Check
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isHydrated, router]);

  // Fetch Organization Details for Subscription tier
  const { data: orgDetails } = useQuery({
    queryKey: ["org-details-layout"],
    queryFn: async () => {
      const res = await apiClient.get("/auth/organization");
      return res.data;
    },
    enabled: isAuthenticated && isHydrated,
  });

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Inventory & Batches", href: "/inventory", icon: Boxes },
    { name: "Menu Items", href: "/products", icon: ChefHat },
    { name: "Recipes", href: "/recipes", icon: BookOpen },
    { name: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart },
    { name: "Sales Log", href: "/sales", icon: DollarSign },
    { name: "Suppliers", href: "/suppliers", icon: Truck },
    { name: "Wastage Log", href: "/wastage", icon: Trash2 },
    { name: "Reports & Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Team Members", href: "/team", icon: Users },
    { name: "AI Insights", href: "/ai-insights", icon: Sparkles },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* --- DESKTOP SIDEBAR --- */}
      <aside
        className={`hidden md:flex flex-col bg-[#0f172a] text-slate-300 border-r border-slate-800/80 shrink-0 transition-all duration-300 relative ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        {/* Brand Logo & Collapse Toggle */}
        <div
          className={`h-16 flex items-center justify-between border-b border-slate-800/80 ${collapsed ? "px-4" : "px-6"}`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
              <ChefHat size={18} />
            </div>
            {!collapsed && (
              <span className="text-base font-black text-white tracking-tight truncate">
                KitchenIQ <span className="text-emerald-400">AI</span>
              </span>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg bg-slate-800/40 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer hidden md:block"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-sidebar-scrollbar">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/15"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <item.icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Subscription Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/20">
          {!collapsed ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white text-sm shadow-inner shrink-0">
                  {userName
                    ? userName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                    : "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate leading-snug">
                    {userName || "User Name"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                      {role || "Staff"}
                    </span>
                    <span className="inline-block w-1 h-1 rounded-full bg-slate-600"></span>
                    <span className="text-[9px] font-bold text-emerald-400 px-1 bg-emerald-500/10 rounded uppercase">
                      {orgDetails?.subscription_tier || "Free"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-400 hover:text-white bg-rose-500/5 hover:bg-rose-500 border border-rose-500/10 hover:border-rose-500 rounded-xl transition-all cursor-pointer"
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div
                title={`${userName} (${role})`}
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white text-xs shadow-inner cursor-pointer"
              >
                {userName
                  ? userName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  : "U"}
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 text-rose-400 hover:text-white bg-rose-500/5 hover:bg-rose-500 border border-rose-500/10 hover:border-rose-500 rounded-xl transition-all cursor-pointer"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* --- MOBILE OVERLAY SIDEBAR --- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-900/60 backdrop-blur-sm">
          <div className="w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <ChefHat size={18} />
                </div>
                <span className="text-base font-black text-white tracking-tight">
                  KitchenIQ AI
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-emerald-500 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <item.icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-950/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white text-xs shadow-inner">
                  {userName
                    ? userName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                    : "U"}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{userName}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">
                    {role}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-400 hover:text-white bg-rose-500/5 hover:bg-rose-500 border border-rose-500/10 hover:border-rose-500 rounded-xl transition-all cursor-pointer"
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          </div>
          <div
            className="flex-1"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
        </div>
      )}

      {/* --- MAIN CONTENT CONTAINER --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-900 p-1 cursor-pointer"
            >
              <Menu size={20} />
            </button>

            {/* Date Display */}
            <div className="hidden sm:flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Calendar size={14} className="text-slate-400" />
              <span>{currentDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search, Notifications, Restaurant indicator */}
            <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700 shadow-sm flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {orgDetails?.name || "KitchenIQ Demo Café"}
            </div>

            <div className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 relative cursor-pointer hover:bg-slate-100 transition-all">
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            </div>
          </div>
        </header>

        {/* Children Pages */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative p-6 md:p-8">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
