"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";

import { buttonClasses } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export type FollowTargetType = "person" | "org" | "project" | "issue";

type FollowButtonProps = {
  targetType: FollowTargetType;
  targetId: string;
  initialIsFollowing: boolean;
  initialFollowerCount: number | null;
  isAuthenticated: boolean;
};

function formatCount(count: number) {
  const n = count < 1000 ? `${count}` : new Intl.NumberFormat(undefined, { notation: "compact" }).format(count);
  return `${n} ${count === 1 ? "follower" : "followers"}`;
}

export default function FollowButton({
  targetType,
  targetId,
  initialIsFollowing,
  initialFollowerCount,
  isAuthenticated,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleToggle = () => {
    const next = !isFollowing;
    // Optimistic update; rolled back if the request fails
    setIsFollowing(next);
    if (typeof followerCount === "number") setFollowerCount(Math.max(0, followerCount + (next ? 1 : -1)));

    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/follow", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setIsFollowing(!next);
        setFollowerCount(followerCount);
        setError(payload?.error ?? "Couldn't update. Please try again.");
        return;
      }

      if (next) {
        toast({ title: "Following", description: "You'll be notified about new updates.", duration: 2500 });
      }
    });
  };

  const count =
    typeof followerCount === "number" ? <p className="text-xs text-soltas-muted">{formatCount(followerCount)}</p> : null;

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-start gap-1.5 sm:items-end">
        <Link
          href={`/login?returnTo=${encodeURIComponent(pathname ?? "/")}`}
          className={buttonClasses({ size: "sm" })}
        >
          <Plus className="h-4 w-4" /> Follow
        </Link>
        {count}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-pressed={isFollowing}
        className={buttonClasses({ variant: isFollowing ? "secondary" : "default", size: "sm" })}
      >
        {isFollowing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {isFollowing ? "Following" : "Follow"}
      </button>
      {count}
      {error ? (
        <p role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
