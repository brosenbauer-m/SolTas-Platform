"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isAdmin as rpcIsAdmin, isSuperadmin as rpcIsSuper } from "@/lib/admin";

type OrganisationContext = {
  id: string;
  name: string;
  role: string;
};

export default function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuper, setIsSuper] = useState(false);

  const [orgs, setOrgs] = useState<OrganisationContext[]>([]);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      if (!session) {
        setOrgs([]);
        return;
      }

      const [a, s] = await Promise.all([rpcIsAdmin(supabase), rpcIsSuper(supabase)]);
      if (!mounted) return;
      setIsAdmin(a);
      setIsSuper(s);

      const { data: orgMembers, error: memberError } = await supabase
        .from("organisation_members")
        .select("organisation_id, role")
        .eq("user_id", session.user.id);

      if (!mounted) return;

      if (memberError) {
        console.error("Failed to load organisation memberships", memberError);
        setOrgs([]);
        return;
      }

      const orgIds = Array.from(
        new Set((orgMembers ?? []).map((m) => m.organisation_id).filter(Boolean))
      ) as string[];

      const orgNameMap = new Map<string, string>();

      if (orgIds.length > 0) {
        const { data: orgRows, error: orgError } = await supabase
          .from("organisations_directory_v1")
          .select("id, name")
          .in("id", orgIds);

        if (!mounted) return;

        if (orgError) {
          console.error("Failed to load organisation names", orgError);
        } else {
          orgRows?.forEach((org) => {
            if (org.id) orgNameMap.set(org.id, org.name ?? "Organisation");
          });
        }
      }

      const nextOrgs: OrganisationContext[] = (orgMembers ?? [])
        .filter((m) => !!m.organisation_id)
        .map((m) => ({
          id: m.organisation_id as string,
          name: orgNameMap.get(m.organisation_id as string) ?? "Organisation",
          role: m.role ?? "member",
        }))
        // De-dupe by org id (just in case)
        .reduce<OrganisationContext[]>((acc, curr) => {
          if (acc.some((o) => o.id === curr.id)) return acc;
          acc.push(curr);
          return acc;
        }, []);

      // Sort by name for a clean menu
      nextOrgs.sort((a2, b2) => a2.name.localeCompare(b2.name));

      setOrgs(nextOrgs);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const itemClass =
    "flex items-center justify-between rounded-xl px-3 py-2.5 text-[15px] text-soltas-text transition-colors duration-150 hover:bg-soltas-light";
  const sectionLabel = "px-3 pb-1 pt-4 text-xs font-medium text-soltas-muted";

  return (
    <div className="flex flex-col">
      <Link href="/profile" className={itemClass} onClick={onNavigate}>
        My profile
      </Link>
      <Link href="/notifications" className={itemClass} onClick={onNavigate}>
        Notifications
      </Link>
      <Link href="/settings" className={itemClass} onClick={onNavigate}>
        Settings
      </Link>

      <p className={sectionLabel}>My organisations</p>
      {orgs.map((org) => (
        <Link key={org.id} href={`/organisations/${org.id}`} className={itemClass} onClick={onNavigate}>
          <span className="truncate">{org.name}</span>
          <span className="ml-2 shrink-0 text-xs text-soltas-muted">{org.role === "admin" ? "Admin" : "Member"}</span>
        </Link>
      ))}
      <Link href="/organisations/create" className={`${itemClass} text-soltas-ocean`} onClick={onNavigate}>
        Create an organisation
      </Link>

      {isAdmin && (
        <Link href="/admin" className={itemClass} onClick={onNavigate}>
          Admin
        </Link>
      )}

      {isSuper && (
        <Link href="/admin/manage" className={itemClass} onClick={onNavigate}>
          Manage admins
        </Link>
      )}

      <div className="my-3 border-t border-soltas-line" />
      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          onNavigate?.();
          router.push("/");
          router.refresh();
        }}
        className={`${itemClass} w-full text-left text-rose-600 hover:bg-rose-50`}
      >
        Sign out
      </button>
    </div>
  );
}
