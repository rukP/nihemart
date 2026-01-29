import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

interface DateFilterSelectorProps {
  filterType: "today" | "all" | "custom";
  customDateRange: DateRange | undefined;
  calendarOpen: boolean;
  onFilterChange: (filterType: "today" | "all" | "custom") => void;
  onCalendarOpenChange: (open: boolean) => void;
  onDateRangeSelect: (range: DateRange | undefined) => void;
}

export const DateFilterSelector: React.FC<DateFilterSelectorProps> = ({
  filterType,
  customDateRange,
  calendarOpen,
  onFilterChange,
  onCalendarOpenChange,
  onDateRangeSelect,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-3 mb-4 md:mb-6">
      {/* Filter buttons */}
      <div className="flex gap-2">
        <Button
          variant={filterType === "today" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            onFilterChange("today");
            onCalendarOpenChange(false);
          }}
          className={
            filterType === "today" ? "bg-orange-500 hover:bg-orange-600" : ""
          }
        >
          Today
        </Button>
        <Button
          variant={filterType === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            onFilterChange("all");
            onCalendarOpenChange(false);
          }}
          className={
            filterType === "all" ? "bg-orange-500 hover:bg-orange-600" : ""
          }
        >
          All Time
        </Button>
        <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant={filterType === "custom" ? "default" : "outline"}
              size="sm"
              className={
                filterType === "custom"
                  ? "bg-orange-500 hover:bg-orange-600"
                  : ""
              }
            >
              <Calendar className="mr-2 h-4 w-4" />
              {customDateRange?.from && customDateRange?.to
                ? `${format(customDateRange.from, "MMM dd")} - ${format(customDateRange.to, "MMM dd")}`
                : "Custom"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="range"
              selected={customDateRange}
              onSelect={(selectedRange) => {
                onDateRangeSelect(selectedRange);
                if (selectedRange?.from && selectedRange?.to) {
                  onFilterChange("custom");
                  onCalendarOpenChange(false);
                }
              }}
              numberOfMonths={2}
              initialFocus
              className="rounded-md border shadow-sm"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Display current filter info */}
      {filterType === "custom" &&
        customDateRange?.from &&
        customDateRange?.to && (
          <div className="text-sm text-gray-600">
            {format(customDateRange.from, "MMM dd, yyyy")} -{" "}
            {format(customDateRange.to, "MMM dd, yyyy")}
          </div>
        )}
    </div>
  );
};
