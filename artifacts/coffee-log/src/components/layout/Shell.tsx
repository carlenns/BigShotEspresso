import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  BookOpen, Coffee, LayoutDashboard,
  Menu, Package, Settings, Sprout, Target, Wrench, Tag, Layers
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
  // Paths that match this item's prefix but belong to a more specific item
  // (e.g. "/shots/new" is Log Shot, not Shot Log). PL-1.
  exclude?: string[];
}

const primaryNav: NavItem[] = [
  { title: "Dashboard",       href: "/",            icon: LayoutDashboard, exact: true },
  { title: "Log Shot",        href: "/shots/new",   icon: Coffee,          exact: true },
  { title: "Shot Log",        href: "/shots",       icon: BookOpen,        exclude: ["/shots/new"] },
  { title: "Reference Shots", href: "/reference",   icon: Target },
];

// PL-7: four everyday tabs plus "More", instead of a 10-item scrolling bar.
const mobileBottomNav: NavItem[] = [
  { title: "Dashboard",       href: "/",            icon: LayoutDashboard, exact: true },
  { title: "Log Shot",        href: "/shots/new",   icon: Coffee,          exact: true },
  { title: "Shot Log",        href: "/shots",       icon: BookOpen,        shortLabel: "Shots", exclude: ["/shots/new"] },
  { title: "Bags", href: "/bags", icon: Package },
];

// Everything after the four everyday tabs. The bottom bar is one swipeable strip
// (mobileBottomNav then this list), not a fixed row with a "More" dropdown.
const mobileBottomMoreNav: NavItem[] = [
  { title: "Reference Shots", href: "/reference", icon: Target },
  { title: "Beans", href: "/beans", icon: Sprout },
  { title: "Equipment", href: "/equipment", icon: Wrench },
  { title: "Accessories", href: "/accessories", icon: Layers },
  { title: "Taste Selectors", href: "/taste-selectors", icon: Tag },
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
  if (item.exclude?.includes(location)) return false;
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

const mobileSwipeNav: NavItem[] = [...mobileBottomNav, ...mobileBottomMoreNav];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const navRef = useRef<HTMLDivElement>(null);

  // Keep the active tab visible when the route changes (e.g. via a link elsewhere).
  useEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [location]);

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

      {/* Mobile Bottom Nav — one horizontally swipeable strip of every page
          (replaces four tabs + More). Tabs are ~22% wide so the fifth is always
          cut off at the edge, which signals that the bar scrolls. Non-color active
          cue: a top underline bar + bolder label weight, so the active tab reads
          correctly for color-blind users, not just via the primary-color text. */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-background pb-safe md:hidden"
        aria-label="Mobile navigation"
      >
        <div
          ref={navRef}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {mobileSwipeNav.map((item) => {
            const isActive = isNavActive(item, location);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex basis-[22%] shrink-0 snap-start flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground font-medium hover:text-foreground"
                )}
              >
                {isActive && <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
                <item.icon className={cn("h-5 w-5", isActive && "fill-primary/10")} />
                <span className="max-w-full truncate px-1">{item.shortLabel ?? item.title.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
