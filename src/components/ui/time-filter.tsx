"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export type TimeFilterValue = {
  preset: "all" | "today" | "custom";
  from: Date | null;
  to: Date | null;
};

interface TimeFilterProps {
  value: TimeFilterValue;
  onChange: (value: TimeFilterValue) => void;
  className?: string;
}

const TimeFilter: React.FC<TimeFilterProps> = ({
  value,
  onChange,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempDateRange, setTempDateRange] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: value.from || undefined,
    to: value.to || undefined,
  });

  const presets = [
    { label: "All Time", value: "all" as const },
    { label: "Today", value: "today" as const },
    { label: "Custom", value: "custom" as const },
  ];

  const handlePresetChange = (preset: "all" | "today" | "custom") => {
    if (preset === "all") {
      onChange({ preset: "all", from: null, to: null });
      setIsOpen(false);
    } else if (preset === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      onChange({ preset: "today", from: today, to: tomorrow });
      setIsOpen(false);
    } else if (preset === "custom") {
      // Just switch to custom mode, don't close
      if (value.preset !== "custom") {
        onChange({ preset: "custom", from: null, to: null });
        setTempDateRange({ from: undefined, to: undefined });
      }
    }
  };

  const handleApplyCustomRange = () => {
    if (tempDateRange.from && tempDateRange.to) {
      onChange({
        preset: "custom",
        from: tempDateRange.from,
        to: tempDateRange.to,
      });
      setIsOpen(false);
    }
  };

  const handleClearCustomRange = () => {
    setTempDateRange({ from: undefined, to: undefined });
    onChange({ preset: "all", from: null, to: null });
  };

  const getDisplayText = () => {
    if (value.preset === "all") return "All Time";
    if (value.preset === "today") return "Today";
    if (value.preset === "custom" && value.from && value.to) {
      return `${format(value.from, "MMM d")} - ${format(value.to, "MMM d, yyyy")}`;
    }
    return "Custom";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-between text-left font-normal min-w-[140px]",
            !value.from && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{getDisplayText()}</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Preset Buttons Sidebar */}
          <div className="flex flex-col border-r bg-slate-50 p-2 gap-1 min-w-[100px]">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                variant="ghost"
                size="sm"
                className={cn(
                  "justify-start text-sm font-normal h-9",
                  value.preset === preset.value &&
                    "bg-orange-100 text-orange-700 hover:bg-orange-100 hover:text-orange-700 font-medium"
                )}
                onClick={() => handlePresetChange(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom Date Range Picker */}
          {value.preset === "custom" && (
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm text-slate-900">
                    Select Date Range
                  </h4>
                  {(tempDateRange.from || tempDateRange.to) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearCustomRange}
                      className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Date Range Display */}
                {tempDateRange.from && tempDateRange.to && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                    <p className="text-xs text-slate-600 mb-1">Selected Range</p>
                    <p className="text-sm font-medium text-slate-900">
                      {format(tempDateRange.from, "MMM d, yyyy")} -{" "}
                      {format(tempDateRange.to, "MMM d, yyyy")}
                    </p>
                  </div>
                )}

                {/* Calendar */}
                <Calendar
                  mode="range"
                  defaultMonth={tempDateRange.from}
                  selected={{
                    from: tempDateRange.from,
                    to: tempDateRange.to,
                  }}
                  onSelect={(range) => {
                    setTempDateRange({
                      from: range?.from,
                      to: range?.to,
                    });
                  }}
                  numberOfMonths={2}
                  className="rounded-md"
                />

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false);
                      setTempDateRange({
                        from: value.from || undefined,
                        to: value.to || undefined,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApplyCustomRange}
                    disabled={!tempDateRange.from || !tempDateRange.to}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TimeFilter;