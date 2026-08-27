import React from "react";
import { Link, useLocation } from "wouter";
import {
  BookOpen, Coffee, LayoutDashboard,
  Menu, Package, Settings, Sprout, Wrench, Tag, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
  // Bottom-nav label override. The mobile bar shows only the first word of
  // `title`, which turns "Log Shot" into "Log" and "Shot Log" into "Shot" —
  // two near-identical adjacent tabs. Set this where the first word is
  // ambiguous.
  shortLabel?: string;
}

const primaryNav: NavItem[] = [
  { title: "Dashboard",       href: "/",            icon: LayoutDashboard, exact: true },
  { title: "Log Shot",        href: "/shots/new",   icon: Coffee,          exact: true },
  { title: "Shot Log",        href: "/shots",       icon: BookOpen },
  { title: "Reference Shots", href: "/reference",   icon: Coffee },
];

const mobileBottomNav: NavItem[] = [
  { title: "Dashboard",       href: "/",            icon: LayoutDashboard, exact: true },
  { title: "Log Shot",        href: "/shots/new",   icon: Coffee,          exact: true },
  { title: "Shot Log",        href: "/shots",       icon: BookOpen,        shortLabel: "Shots" },
  { title: "Reference Shots", href: "/reference",   icon: Coffee },
  { title: "Beans", href: "/beans", icon: Sprout },
  { title: "Bags", href: "/bags", icon: Package },
  { title: "Equipment", href: "/equipment", icon: Wrench },
  { title: "Accessories", href: "/accessories", icon: Layers },
  { title: "Taste", href: "/taste-selectors", icon: Tag },
  { title: "Settings", href: "/settings", icon: Settings },
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
  { title: "Settings", href: "/settings", icon: Settings },
];

const mobileMoreNav: NavItem[] = [
  { title: "Equipment", href: "/equipment", icon: Wrench },
  { title: "Accessories", href: "/accessories", icon: Layers },
  { title: "Taste Selectors", href: "/taste-selectors", icon: Tag },
  { title: "Settings", href: "/settings", icon: Settings },
];

function isNavActive(item: NavItem, location: string): boolean {
  if (item.exact) return location === item.href;
  if (item.href === "/") return location === "/";
  return location === item.href || location.startsWith(item.href + "/");
}

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
            isNavActive(item, location)
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
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" asChild className="rounded-full px-3 h-8 text-xs gap-1">
            <Link href="/shots/new">
              <Coffee className="h-3.5 w-3.5" /> Log Shot
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" aria-label="Open setup menu">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Setup &amp; System</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {mobileMoreNav.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="flex w-full items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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

      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 h-16 overflow-x-auto border-t bg-background px-1 pb-safe md:hidden",
          // Right-edge fade signals there's more to scroll to — the bar has
          // no other visual cue that it scrolls, which is what actually made
          // Settings undiscoverable on phone (the row hard-clipped at the
          // viewport edge with no hint anything else existed off-screen).
          "[mask-image:linear-gradient(to_right,black_85%,transparent_100%)]",
          "[-webkit-mask-image:linear-gradient(to_right,black_85%,transparent_100%)]"
        )}
        aria-label="Swipeable mobile navigation"
      >
        <div className="flex h-full min-w-max snap-x snap-mandatory">
        {mobileBottomNav.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex w-20 shrink-0 snap-start flex-col items-center justify-center gap-0.5 text-[10px] transition-colors",
                isActive ? "text-primary font-semibold" : "text-muted-foreground font-medium hover:text-foreground"
              )}
            >
              {/* Non-color active cue: a top underline bar + bolder label
                  weight, so the active tab reads correctly for color-blind
                  users, not just via the primary-color text. */}
              {isActive && <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
              <item.icon className={cn("h-5 w-5", isActive && "fill-primary/10")} />
              <span>{item.shortLabel ?? item.title.split(" ")[0]}</span>
            </Link>
          );
        })}
        </div>
      </nav>
    </div>
  );
}
