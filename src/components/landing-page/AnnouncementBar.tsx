"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgePercent, Flag, Globe, Languages } from "lucide-react";
import Link from "next/link";
import { FC } from "react";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { Icons } from "../icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/locales";
import { useAuth } from "@/hooks/useAuth";

interface AnnouncementBarProps {}

const AnnouncementBar: FC<AnnouncementBarProps> = ({}) => {
  const { language, setLanguage, t } = useLanguage();
  const { isLoggedIn, hasRole } = useAuth();

  const isAdmin = isLoggedIn && hasRole("admin");

  // Announcement state
  const [announcement, setAnnouncement] = useState("HELP LINE:0792412177");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load announcement from API
  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await fetch("/api/announcement");
        if (res.ok) {
          const data = await res.json();
          if (data?.announcement) setAnnouncement(data.announcement);
        }
      } catch (e) {
        // fallback to default
      }
    };
    fetchAnnouncement();
  }, []);

  // Save announcement to API
  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcement }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEditing(false);
    } catch (e) {
      toast.error("Failed to save announcement");
    }
    setLoading(false);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const getLangShort = (lang: Language) =>
    lang === "rw" ? "KIN" : lang.toUpperCase();
  const getLangFull = (lang: Language) =>
    lang === "rw" ? t("language.rw") : t("language.en");

  return (
    <div className="w-full bg-brand-orange text-white py-2">
      <MaxWidthWrapper
        size={"lg"}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <BadgePercent className="h-5 sm:h-7 w-5 sm:w-7" />
          {editing ? (
            <input
              title="Announcement"
              placeholder="Enter announcement..."
              aria-label="Announcement input"
              className="text-black px-2 py-1 rounded text-sm md:text-base font-semibold min-w-[200px] max-w-[400px]"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              disabled={loading}
            />
          ) : (
            <p className="font-semibold text-sm md:text-base">{announcement}</p>
          )}
          {isAdmin &&
            (editing ? (
              <>
                <button
                  className="ml-2 px-2 py-1 bg-white text-orange-500 rounded text-xs font-semibold"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  className="ml-2 px-2 py-1 bg-white text-orange-500 rounded text-xs font-semibold"
                  onClick={() => setEditing(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="ml-2 px-2 py-1 bg-white text-orange-500 rounded text-xs font-semibold"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            ))}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={t("nav.language") || "Select language"}
              className="flex lg:items-center bg-white text-orange-500 hover:bg-white/90 outline-none border-none"
            >
              <Languages className="h-4 w-4" />
              <span className="hidden lg:flex">{getLangFull(language)}</span>
              <span className="lg:hidden">{getLangShort(language)}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[9999]">
            <DropdownMenuItem onClick={() => handleLanguageChange("en")}>
              English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLanguageChange("rw")}>
              Kinyarwanda
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="hidden items-center gap-1 md:flex">
          <Link
            href={"https://www.instagram.com/nihe_mart/"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="hover:text-brand-orange transition-colors"
          >
            <Icons.landingPage.instagram className="h-6 w-6" />
          </Link>
          <Link
            href={"https://web.facebook.com/profile.php?id=61554500515881#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="hover:text-brand-orange transition-colors"
          >
            <Icons.landingPage.facebook className="h-6 w-6" />
          </Link>
          <Link
            href={"https://www.tiktok.com/@nihe_mart"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            className="hover:text-brand-orange transition-colors"
          >
            <Icons.landingPage.tiktok className="h-6 w-6" />
          </Link>
          <Link
            href={"https://youtube.com/@nihemart?si=ekAIqtCjygt9hgTW"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="hover:text-brand-orange transition-colors"
          >
            <Icons.landingPage.youtube className="h-6 w-6" />
          </Link>
        </div>
      </MaxWidthWrapper>
    </div>
  );
};

export default AnnouncementBar;
