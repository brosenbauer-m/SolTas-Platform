"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, User, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import UserMenu from "@/components/UserMenu";
import CreateMenuButton from "@/components/CreateMenuButton";
type Profile = {
  id: string;
  kind: "individual" | "organisation";
  full_name: string | null;
  surname: string | null;
  organisation_name: string | null;
};

function initials(p: Profile | null) {
  if (!p) return "•";
  if (p.kind === "organisation")
    return (p.organisation_name ?? "Org").slice(0, 2).toUpperCase();
  const name = [p.full_name, p.surname].filter(Boolean).join(" ");
  return name
    ? name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";
}

type NavLinkItem = { type: "link"; href: string; label: string };
type NavDropdownItem = {
  type: "dropdown";
  label: string;
  items: Array<{ href: string; label: string }>;
};
type NavItem = NavLinkItem | NavDropdownItem;

export default function Header() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  // Close mobile nav on route change
  useEffect(() => {
    // Use a microtask to avoid synchronous setState in effect
    queueMicrotask(() => setMobileNavOpen(false));
  }, [pathname]);

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
      // Use a microtask to avoid synchronous setState in effect
      queueMicrotask(() => setProfile(null));
      return;
    }

    // NOTE: Keep this simple + reliable: fetch by id only.
    // The previous `.eq("id,kind", ...)` is not valid for PostgREST and can cause issues.
    supabase
      .from("profiles")
      .select("id, kind, full_name, surname, organisation_name")
      .eq("id", sessionUserId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setProfile(null);
          return;
        }
        setProfile((data ?? null) as Profile | null);
      });
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId) {
      // Use a microtask to avoid synchronous setState in effect
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

  const navItems = useMemo<NavItem[]>(
    () => [
      { type: "link", href: "/", label: "Home" },
      {
        type: "dropdown",
        label: "About",
        items: [
          { href: "/about", label: "What is Solarpunk Taskforce" },
          { href: "/services", label: "Services" },
        ],
      },
      {
        type: "dropdown",
        label: "Find",
        items: [
          { href: "/projects", label: "Find Projects" },
          { href: "/find-organisations", label: "Find Organisations" },
          { href: "/funding", label: "Find Funding" },
          { href: "/watchdog", label: "Watchdog Community" },
        ],
      },
      { type: "link", href: "/feed", label: "Feed" },
    ],
    []
  );

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href;
  };

  const isDropdownActive = (items: { href: string }[]) =>
    items.some((item) => pathname === item.href);

  const addButton = <CreateMenuButton />;

  const profileControls = (
    <div className="relative">
      <button
        onClick={() => setProfileOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-full bg-soltas-ocean text-white hover:bg-soltas-abyssal transition-all duration-200"
        aria-label="Account"
      >
        {profile ? (
          <span className="text-xs font-semibold">{initials(profile)}</span>
        ) : (
          <User className="h-4 w-4" />
        )}
      </button>

      {profileOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
          <nav className="fixed right-0 top-0 z-50 flex h-screen w-64 max-w-[80vw] flex-col bg-soltas-white p-4 text-sm text-soltas-text">
            <UserMenu onNavigate={() => setProfileOpen(false)} />
          </nav>
        </>
      )}
    </div>
  );

  const notificationsButton = (
    <Link
      href="/notifications"
      className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-soltas-light text-soltas-ocean transition-all duration-200"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
          {unreadCount}
        </span>
      ) : null}
    </Link>
  );

  return (
    <header className="relative z-50 soltas-header-glass">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          {/* Mobile hamburger toggle */}
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-soltas-light text-soltas-text md:hidden"
            onClick={() => setMobileNavOpen((o) => !o)}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="truncate text-base font-bold text-soltas-text sm:text-lg"
            aria-label="Home"
          >
            Solarpunk Taskforce
          </button>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {navItems.map((item) => {
              if (item.type === "link") {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                      active ? "text-soltas-ocean" : "text-soltas-ocean hover:text-soltas-glacial"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              }

              const active = isDropdownActive(item.items);

              return (
                <div key={item.label} className="group flex items-center">
                  <button
                    type="button"
                    className={`flex items-center gap-1 whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                      active ? "text-soltas-ocean" : "text-soltas-ocean hover:text-soltas-glacial"
                    }`}
                    aria-haspopup="true"
                    aria-expanded="false"
                  >
                    {item.label}
                    <span aria-hidden="true" className="text-xs transition-transform duration-200 group-hover:rotate-90">
                      ▸
                    </span>
                  </button>

                  <div className="flex max-w-0 items-center overflow-hidden opacity-0 transition-all duration-300 group-hover:max-w-4xl group-hover:opacity-100 group-focus-within:max-w-4xl group-focus-within:opacity-100">
                    {item.items.map((link) => {
                      const childActive = isActive(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                            childActive ? "text-soltas-bark" : "text-soltas-bark hover:text-soltas-clay"
                          }`}
                          aria-current={childActive ? "page" : undefined}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {sessionUserId ? (
            <>              {addButton}
              {notificationsButton}
              {profileControls}
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full border border-soltas-glacial px-4 py-2 text-sm text-soltas-ocean hover:bg-soltas-light transition-all duration-200">
                Sign in
              </Link>

              {/* ✅ Resolved: keep responsive "hidden ... sm:inline-flex" version from main */}
              <Link
                href="/signup"
                className="hidden rounded-full bg-soltas-ocean px-4 py-2 text-sm text-white hover:bg-soltas-abyssal transition-all duration-200 sm:inline-flex"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile nav - collapsible via hamburger */}
      {mobileNavOpen && (
        <nav className="border-t border-soltas-glacial/20 bg-white/95 backdrop-blur-xl px-4 pb-4 pt-2 md:hidden" aria-label="Primary">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              if (item.type === "link") {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                      active ? "bg-soltas-light text-soltas-ocean" : "text-soltas-ocean hover:bg-soltas-light"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              }

              const active = isDropdownActive(item.items);

              return (
                <details key={item.label} className="rounded-lg" open={active}>
                  <summary className="cursor-pointer list-none rounded-lg px-3 py-2.5 text-sm font-semibold text-soltas-ocean hover:bg-slate-50">
                    <span className="flex items-center justify-between">
                      {item.label}
                      <span aria-hidden="true" className="text-xs text-soltas-muted">
                        &#9662;
                      </span>
                    </span>
                  </summary>

                  <div className="flex flex-col gap-1 pb-1 pl-3">
                    {item.items.map((link) => {
                      const childActive = isActive(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`rounded-md px-3 py-2 text-sm font-semibold ${
                            childActive
                              ? "bg-soltas-light text-soltas-bark"
                              : "text-soltas-bark hover:bg-soltas-light"
                          }`}
                          aria-current={childActive ? "page" : undefined}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </details>
              );
            })}

            {/* Show Register link in mobile nav if not logged in */}
            {!sessionUserId && (
              <Link
                href="/signup"
                className="mt-2 rounded-lg bg-soltas-ocean px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-soltas-abyssal transition-all duration-200 sm:hidden"
              >
                Register
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
