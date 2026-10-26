"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BookOpen,
  Calendar,
  Compass,
  FilePlus2,
  Home,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Search,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { logoutAction } from "@/actions/auth-actions";
import { GlobalCommandPalette } from "@/components/layout/global-command-palette";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { User } from "@/types/domain";

interface AppShellProps {
  user: User;
  draftReadingsCount: number;
  todayAppointmentsCount: number;
  children: React.ReactNode;
}

function GrimorioBrandMark() {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      className="size-6 shrink-0"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="2.5"
        width="20"
        height="23"
        rx="3"
        className="stroke-ink"
        strokeWidth="1.7"
      />
      <circle
        cx="14"
        cy="14"
        r="4.5"
        className="stroke-accent"
        strokeWidth="1.7"
      />
      <path
        d="M14 6.5V9.5M14 18.5V21.5M8.5 14H9.5M18.5 14H19.5"
        className="stroke-ink"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppShell({
  user,
  draftReadingsCount,
  todayAppointmentsCount,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [tabletMenuOpen, setTabletMenuOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (!e.matches) {
        setTabletMenuOpen(false);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const primaryNav = [
    {
      href: "/",
      label: "Inicio",
      shortLabel: "Inicio",
      icon: Home,
      exact: true,
      queueBadge: null as string | null,
    },
    {
      href: "/lecturas",
      label: "Lecturas",
      shortLabel: "Lecturas",
      icon: ScrollText,
      exact: false,
      queueBadge:
        draftReadingsCount > 0 ? `Borradores ${draftReadingsCount}` : null,
    },
    {
      href: "/agenda",
      label: "Agenda",
      shortLabel: "Agenda",
      icon: Calendar,
      exact: false,
      queueBadge:
        todayAppointmentsCount > 0 ? `Hoy ${todayAppointmentsCount}` : null,
    },
    {
      href: "/consultantes",
      label: "Consultantes",
      shortLabel: "Consultantes",
      icon: Users,
      exact: false,
      queueBadge: null,
    },
    {
      href: "/grimorio",
      label: "Cartas y mazos",
      shortLabel: "Cartas",
      icon: BookOpen,
      exact: false,
      queueBadge: null,
    },
  ];

  const secondaryNav = [
    {
      href: "/fenomenos",
      label: "Eventos del mazo",
      icon: Compass,
    },
    {
      href: "/ajustes",
      label: "Ajustes y respaldos",
      icon: Settings,
    },
  ];

  const isRouteActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const res = await logoutAction();
    if (res.ok) {
      toast.success("Sesión cerrada.");
      router.push("/acceso");
      router.refresh();
    } else {
      toast.error(res.error);
      setLoggingOut(false);
    }
  };

  const renderSidebarContent = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        {/* Product Mark & Workspace Scope */}
        <div className="px-2 pt-1">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-lg py-1"
          >
            <GrimorioBrandMark />
            <div className="min-w-0">
              <p className="font-serif text-lg leading-none text-ink">
                Mesa de Tarot
              </p>
              <p className="mt-1 truncate text-xs text-muted">
                {user.workspaceName}
              </p>
            </div>
          </Link>
          {user.isDemo ? (
            <div className="mt-2.5">
              <Badge
                variant="warning"
                title="Espacio cargado con registros de ejemplo"
              >
                Espacio de demostración
              </Badge>
            </div>
          ) : null}
        </div>

        {/* Quick Search & Primary Action */}
        <div className="space-y-2 px-1">
          <Button
            asChild
            variant="primary"
            className="w-full justify-start"
            onClick={onNavigate}
          >
            <Link href="/lecturas/nueva">
              <FilePlus2 className="size-4" aria-hidden="true" />
              <span>Nueva lectura</span>
            </Link>
          </Button>

          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              setCommandOpen(true);
            }}
            className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 text-xs text-muted transition-colors hover:border-control hover:text-ink"
          >
            <span className="flex items-center gap-2">
              <Search className="size-3.5" aria-hidden="true" />
              <span>Buscar…</span>
            </span>
            <kbd className="rounded border border-border bg-ground px-1.5 py-0.5 text-[11px] text-muted">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Primary Navigation */}
        <nav aria-label="Navegación principal" className="space-y-1">
          <p className="px-3 pb-1 text-xs text-muted">Menú principal</p>
          {primaryNav.map((item) => {
            const active = isRouteActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[36px] items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-active text-ink font-medium"
                    : "text-muted hover:bg-surface hover:text-ink"
                )}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.queueBadge ? (
                  <span className="rounded bg-ground px-1.5 py-0.5 text-[11px] font-medium text-ink border border-border num-tabular">
                    {item.queueBadge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Secondary Navigation */}
        <nav aria-label="Herramientas y configuración" className="space-y-1">
          <p className="px-3 pb-1 text-xs text-muted">Herramientas</p>
          {secondaryNav.map((item) => {
            const active = isRouteActive(item.href, false);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[36px] items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-active text-ink font-medium"
                    : "text-muted hover:bg-surface hover:text-ink"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom User & Theme Controls */}
      <div className="space-y-2 border-t border-border pt-3 px-1">
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            aria-label="Cambiar tema claro u oscuro"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-ink active:scale-95 transition-all duration-150"
          >
            <Sun className="hidden size-4 dark:block transition-transform duration-200" aria-hidden="true" />
            <Moon className="block size-4 dark:hidden transition-transform duration-200" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-muted hover:bg-surface hover:text-ink disabled:opacity-50"
        >
          <LogOut className="size-3.5" aria-hidden="true" />
          <span>
            {loggingOut ? "Cerrando sesión…" : "Cerrar sesión / Cambiar cuenta"}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-hidden bg-ground text-ink">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-on-primary"
      >
        Saltar al contenido principal
      </a>

      {/* Desktop Open-Plane Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[236px] lg:flex-col lg:border-r lg:border-border lg:bg-ground lg:p-3.5">
        {renderSidebarContent()}
      </aside>

      {/* Mobile & Tablet Sticky Header */}
      <header className="sticky top-0 z-30 flex h-13 w-full items-center justify-between gap-2 border-b border-border bg-ground px-3 sm:px-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          {/* Hamburger button exclusively for Tablet (md..lg); Mobile uses bottom bar */}
          <button
            type="button"
            onClick={() => setTabletMenuOpen(true)}
            aria-expanded={tabletMenuOpen}
            aria-label="Abrir menú de navegación"
            className="hidden md:flex lg:hidden size-10 -ml-1.5 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-surface"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <Link href="/" className="flex min-w-0 items-center gap-2">
            <GrimorioBrandMark />
            <span className="truncate font-serif text-base text-ink">
              Mesa de Tarot
            </span>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            aria-label="Buscar"
            className="flex size-9 sm:size-10 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
          >
            <Search className="size-4" aria-hidden="true" />
          </button>

          <Link
            href="/ajustes"
            aria-label="Ajustes y cuenta"
            aria-current={isRouteActive("/ajustes") ? "page" : undefined}
            className={cn(
              "flex md:hidden size-9 items-center justify-center rounded-lg transition-colors",
              isRouteActive("/ajustes")
                ? "bg-active text-ink"
                : "text-muted hover:bg-surface hover:text-ink"
            )}
          >
            <Settings className="size-4" aria-hidden="true" />
          </Link>

          <Button
            asChild
            size="sm"
            variant="primary"
            className="h-8.5 sm:h-9 px-2.5 sm:px-3 text-xs"
          >
            <Link href="/lecturas/nueva">Nueva lectura</Link>
          </Button>
        </div>
      </header>

      {/* Tablet Navigation Drawer */}
      <Sheet open={tabletMenuOpen} onOpenChange={setTabletMenuOpen}>
        <SheetContent side="left" className="p-4">
          <SheetHeader className="sr-only">
            <SheetTitle>Menú de navegación</SheetTitle>
            <SheetDescription>
              Navegación principal de la aplicación
            </SheetDescription>
          </SheetHeader>
          {renderSidebarContent(() => setTabletMenuOpen(false))}
        </SheetContent>
      </Sheet>

      {/* Main Content Canvas */}
      <div className="min-w-0 w-full max-w-full overflow-x-hidden lg:pl-[236px]">
        <main
          key={pathname}
          id="contenido-principal"
          tabIndex={-1}
          className="t-page-enter mx-auto w-full min-w-0 max-w-[1160px] px-4 py-5 pb-24 sm:px-6 sm:py-8 lg:px-10 lg:py-9 lg:pb-12 outline-none overflow-x-hidden"
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Bar (<= 5 destinations with icon + label) */}
      <nav
        aria-label="Navegación móvil rápida"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-ground/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden shadow-sm"
      >
        {primaryNav.map((item) => {
          const active = isRouteActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[54px] min-w-0 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] sm:text-[11px] leading-tight transition-all duration-150 active:scale-95",
                active ? "text-ink font-semibold" : "text-muted hover:text-ink"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-transform duration-200",
                  active && "scale-110 text-accent"
                )}
                aria-hidden="true"
              />
              <span className="max-w-full truncate">{item.shortLabel}</span>
              {active ? (
                <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-accent" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <GlobalCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
