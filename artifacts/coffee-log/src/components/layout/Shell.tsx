import React from "react";
import { Link, useLocation } from "wouter";
import { Activity, BookOpen, Coffee, LayoutDashboard, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Shot Log", href: "/shots", icon: BookOpen },
  { title: "Reference Shots", href: "/reference", icon: Coffee },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-[100dvh] w-full flex-col md:flex-row bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2 font-serif text-lg font-medium text-foreground">
          <Coffee className="h-5 w-5 text-primary" />
          Coffee Log
        </div>
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/shots/new">
            <Plus className="h-5 w-5" />
          </Link>
        </Button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6 font-serif text-xl font-medium text-sidebar-foreground">
          <Coffee className="h-6 w-6 text-sidebar-primary" />
          Coffee Log
        </div>
        
        <ScrollArea className="flex-1 py-6">
          <nav className="flex flex-col gap-1 px-4">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  location === item.href || (item.href !== "/" && location.startsWith(item.href))
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70"
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </Button>
            ))}
          </nav>
        </ScrollArea>
        
        <div className="p-4 border-t border-sidebar-border">
          <Button className="w-full justify-start gap-2 shadow-sm" asChild>
            <Link href="/shots/new">
              <Plus className="h-4 w-4" />
              Log New Shot
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t bg-background px-2 pb-safe md:hidden">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-primary/10")} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
