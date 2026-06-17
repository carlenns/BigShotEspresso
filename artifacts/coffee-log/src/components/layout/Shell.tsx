import React from "react";
import { Link, useLocation } from "wouter";
import {
  BookOpen, Coffee, Database, LayoutDashboard,
  Package, Settings, Sprout, Wrench, Tag, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const primaryNav: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Shot Log", href: "/shots", icon: BookOpen },
  { title: "Reference Shots", href: "/reference", icon: Coffee },
];

const libraryNav: NavItem[] = [
  { title: "Beans", href: "/beans", icon: Sprout },
  { title: "Bags", href: "/bags", icon: Package },
  { title: "Equipment", href: "/equipment", icon: Wrench },
  { title: "Accessories", href: "/accessories", icon: Layers },
];

const tasteNav: NavItem[] = [
  { title: "Taste Selectors", href: "/taste-selectors", icon: Tag },
];

const systemNav: NavItem[] = [
  { title: "Sync Audit", href: "/audit", icon: Database },
  { title: "Settings", href: "/settings", icon: Settings },
];

function NavGroup({ items, label }: { items: NavItem[]; label?: string }) {
  const [location] = useLocation();
  return (
    <div>
      {label && (
        <p className="px-3 mb-1 text-xs font-medium text-sidebar-foreground/40 uppercase tracking-wider">
          {label}
        </p>
      )}
      {items.map((item) => (
        <Button
          key={item.href}
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            location === item.href || (item.href !== "/" && location.startsWith(item.href))
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70"
          )}
          asChild
        >
          <Link href={item.href}>
            <item.icon className="h-4 w-4 shrink-0" />
            {item.title}
          </Link>
        </Button>
      ))}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-[100dvh] w-full flex-col md:flex-row bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:hidden">
        <div className="flex flex-col leading-none">
          <span className="font-serif text-base font-semibold text-foreground tracking-tight">BigShot<span className="text-primary">Espresso</span></span>
          <span className="text-[10px] text-muted-foreground leading-none">Log · Analyse · Repeat</span>
        </div>
        <Button variant="default" size="sm" asChild className="rounded-full px-3 h-8 text-xs gap-1">
          <Link href="/shots/new">
            <Coffee className="h-3.5 w-3.5" /> Log Shot
          </Link>
        </Button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-16 flex-col justify-center border-b border-sidebar-border px-5">
          <span className="font-serif text-lg font-semibold text-sidebar-foreground tracking-tight leading-tight">
            BigShot<span className="text-sidebar-primary">Espresso</span>
          </span>
          <span className="text-[11px] text-sidebar-foreground/40 leading-none mt-0.5">Log · Analyse · Repeat</span>
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="flex flex-col gap-4 px-4">
            <NavGroup items={primaryNav} />
            <Separator className="opacity-50" />
            <NavGroup items={libraryNav} label="Library" />
            <Separator className="opacity-50" />
            <NavGroup items={tasteNav} label="Flavour" />
            <Separator className="opacity-50" />
            <NavGroup items={systemNav} label="System" />
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-sidebar-border">
          <Button className="w-full justify-start gap-2 shadow-sm" asChild>
            <Link href="/shots/new">
              <Coffee className="h-4 w-4" />
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t bg-background px-1 pb-safe md:hidden">
        {[...primaryNav, libraryNav[1]].map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-primary/10")} />
              <span>{item.title.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
