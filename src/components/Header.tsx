"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import UserMenu from "@/components/UserMenu";
import CreateMenuButton from "@/components/CreateMenuButton";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  kind: "individual" | "organisation" | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  surname: string | null;
  organisation_name: string | null;
  avatar_url: string | null;
};

const NAV_ITEMS = [
  { href: "/projects", label: "Projects" },
  { href: "/find-organisations", label: "Organisations" },
  { href: "/funding", label: "Funding" },
  { href: "/watchdog", label: "Watchdog" },
  { href: "/feed", label: "Feed" },
  { href: "/about", label: "About" },
];

function displayName(p: Profile | null) {
  if (!p) return "";
  if (p.kind === "organisation" && p.organisation_name) return p.organisation_name;
  return (
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    [p.full_name, p.surname].filter(Boolean).join(" ") ||
    ""
  );
}

function initials(p: Profile | null) {
  const name = displayName(p);
  if (!name) return "";
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/find-organisations") return pathname === href || pathname.startsWith("/organisations");
  if (href === "/about") return pathname === "/about" || pathname === "/services";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-full" aria-label="Solarpunk Taskforce home">
      <span
        aria-hidden="true"
        className="h-7 w-7 rounded-full bg-[radial-gradient(circle_at_30%_30%,#8FC3DA_0%,#2E6B8A_45%,#2F855A_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
      />
      <span className="text-[15px] font-semibold tracking-tight text-soltas-text">
        Solarpunk <span className="hidden sm:inline">Taskforce</span>
      </span>
    </Link>
  );
}

export default function Header() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const pathname = usePathname() ?? "/";

  // Close menus on route change
  useEffect(() => {
    queueMicrotask(() => {
      setMobileNavOpen(false);
      setAccountOpen(false);
    });
  }, [pathname]);

  // Lock page scroll while a full-screen menu is open
  useEffect(() => {
    const open = mobileNavOpen || accountOpen;
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [mobileNavOpen, accountOpen]);

  // Escape closes menus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileNavOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setSessionUserId(data.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSessionUserId(s?.user?.id ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionUserId) {
      queueMicrotask(() => setProfile(null));
      return;
    }

    supabase
      .from("profiles")
      .select("id, kind, first_name, last_name, full_name, surname, organisation_name, avatar_url")
      .eq("id", sessionUserId)
      .maybeSingle()
      .then(({ data, error }) => {
        setProfile(error ? null : ((data ?? null) as Profile | null));
      });
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId) {
      queueMicrotask(() => setUnreadCount(0));
      return;
    }

    let active = true;

    const loadUnreadCount = async () => {
      const { data, error } = await supabase.rpc("get_unread_notification_count");
      if (active && !error) setUnreadCount(typeof data === "number" ? data : 0);
    };

    loadUnreadCount();

    const handleUpdate = () => loadUnreadCount();
    window.addEventListener("notifications:updated", handleUpdate);

    return () => {
      active = false;
      window.removeEventListener("notifications:updated", handleUpdate);
    };
  }, [sessionUserId]);

  const name = displayName(profile);
  const avatar = (
    <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-soltas-ocean text-[11px] font-semibold text-white">
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(profile) || "•"
      )}
    </span>
  );

  const iconButton =
    "relative grid h-10 w-10 place-items-center rounded-full text-soltas-text transition-colors duration-200 hover:bg-soltas-light";

  return (
    <header className="soltas-header-glass relative z-50">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Logo />

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm transition-colors duration-200",
                    active
                      ? "bg-soltas-light font-medium text-soltas-text"
                      : "text-soltas-muted hover:text-soltas-text",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {sessionUserId ? (
            <>
              <CreateMenuButton />
              <Link href="/notifications" className={iconButton} aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}>
                <Bell className="h-[18px] w-[18px]" />
                {unreadCount > 0 ? (
                  <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-4 text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Link>
              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-full transition hover:opacity-90"
                aria-label="Account menu"
                aria-expanded={accountOpen}
              >
                {avatar}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClasses({ variant: "ghost", size: "sm", className: "text-soltas-text" })}>
                Log in
              </Link>
              <Link href="/signup" className={buttonClasses({ size: "sm", className: "hidden sm:inline-flex" })}>
                Join
              </Link>
            </>
          )}

          <button
            type="button"
            className={cn(iconButton, "lg:hidden")}
            onClick={() => setMobileNavOpen((o) => !o)}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / tablet navigation: full-screen sheet */}
      {mobileNavOpen && (
        <nav
          className="fixed inset-x-0 bottom-0 top-16 z-50 overflow-y-auto bg-white/95 px-6 pb-10 pt-4 backdrop-blur-xl lg:hidden"
          aria-label="Primary"
        >
          <ul className="flex flex-col">
            {[{ href: "/", label: "Home" }, ...NAV_ITEMS, { href: "/services", label: "Services" }].map((item) => {
              const active = item.href === "/" ? pathname === "/" : isActivePath(pathname, item.href) && !(item.href === "/about" && pathname === "/services");
              return (
                <li key={item.href} className="border-b border-soltas-line">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block py-4 text-2xl font-semibold tracking-tight transition-colors",
                      active ? "text-soltas-ocean" : "text-soltas-text hover:text-soltas-ocean",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          {!sessionUserId && (
            <div className="mt-8 flex flex-col gap-3">
              <Link href="/signup" className={buttonClasses({ size: "lg" })}>
                Join Solarpunk Taskforce
              </Link>
              <Link href="/login" className={buttonClasses({ variant: "outline", size: "lg" })}>
                Log in
              </Link>
            </div>
          )}
        </nav>
      )}

      {/* Account panel */}
      {accountOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-soltas-text/20 backdrop-blur-[2px]" onClick={() => setAccountOpen(false)} />
          <aside
            className="fixed bottom-0 right-0 top-0 z-50 flex w-80 max-w-[88vw] flex-col overflow-y-auto bg-white p-4 shadow-2xl sm:rounded-l-3xl"
            aria-label="Account"
          >
            <div className="flex items-center justify-between gap-3 px-1 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                {avatar}
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-soltas-text">{name || "Your account"}</p>
                  <p className="text-xs text-soltas-muted">Signed in</p>
                </div>
              </div>
              <button type="button" onClick={() => setAccountOpen(false)} className={iconButton} aria-label="Close account menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <UserMenu onNavigate={() => setAccountOpen(false)} />
          </aside>
        </>
      )}
    </header>
  );
}
