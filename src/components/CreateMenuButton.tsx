"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CreateMenuButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="secondary" aria-label="Create: project, funding or issue">
          <Plus className="h-[18px] w-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem asChild>
          <Link href="/projects/new">New project</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/funding/new">New funding opportunity</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/issues/new">Report an issue</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
