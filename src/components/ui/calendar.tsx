import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

import "react-day-picker/dist/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex items-center justify-between px-1 text-sm font-medium",
        caption_label: "text-base font-semibold text-soltas-text",
        nav: "flex items-center gap-1",
        nav_button:
          "flex h-9 w-9 items-center justify-center rounded-full border border-soltas-glacial/30 text-soltas-muted transition hover:bg-soltas-light",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "w-9 text-center text-xs font-medium text-soltas-muted",
        row: "flex w-full",
        cell: "relative w-9 text-center text-sm",
        day: cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-soltas-text transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soltas-ocean",
        ),
        day_today: "bg-soltas-glacial/20 text-soltas-ocean",
        day_selected: "bg-soltas-ocean text-white hover:bg-soltas-ocean",
        day_outside: "text-soltas-muted/40",
        day_disabled: "text-soltas-muted/40 opacity-50",
        day_range_start: "rounded-l-full",
        day_range_end: "rounded-r-full",
        ...classNames,
      }}
      {...props}
    />
  );
}
