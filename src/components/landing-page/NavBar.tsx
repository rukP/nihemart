"use client";

import Image from "next/image";
import { FC, useState, useEffect } from "react";
import logo from "@/assets/logo.png";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { cn } from "@/lib/utils";
import {
  Globe,
  Menu,
  ShoppingCart,
  User,
  LogOut,
  Search,
  EllipsisVertical,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Link from "next/link";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "../ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { SearchPopover } from "../search-popover";
import { Language } from "@/locales";
import NotificationsBell from "../NotificationsBell";

interface NavBarProps {}

export const routes = [
  { name: "nav.home", url: "/" },
  { name: "nav.products", url: "/products" },
  { name: "nav.contact", url: "/contact" },
  { name: "nav.howToBuy", url: "/how-to-buy" },
] as const;

export const mobileRoutes = [
  { name: "nav.home", url: "/" },
  { name: "nav.about", url: "/about" },
  { name: "nav.products", url: "/products" },
  { name: "nav.contact", url: "/contact" },
  { name: "nav.howToBuy", url: "/how-to-buy" },
  { name: "nav.returns", url: "/returns" },
] as const;

const NavBar: FC<NavBarProps> = ({}) => {
  const cart = useCart();
  const { items, itemsCount, initialized } = cart;
  const [mounted, setMounted] = useState(false);
  const uniqueProductCount = items.length;
  const [badgeCount, setBadgeCount] = useState<number>(
    () => uniqueProductCount || 0
  );
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setBadgeCount(uniqueProductCount || 0), [uniqueProductCount]);

  useEffect(() => {
    try {
      if (
        (uniqueProductCount === 0 && !initialized) ||
        uniqueProductCount === 0
      ) {
        const raw = localStorage.getItem("cart");
        if (raw) {
          const parsed = JSON.parse(raw) as Array<any>;
          const total = parsed.length;
          if (total && total !== badgeCount) setBadgeCount(total);
        }
      }
    } catch (err) {}
  }, [initialized]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cart") {
        try {
          const val = e.newValue;
          if (!val) {
            setBadgeCount(0);
            return;
          }
          const parsed = JSON.parse(val) as Array<any>;
          const total = parsed.length;
          setBadgeCount(total);
        } catch (err) {}
      }
    };
    window.addEventListener("storage", onStorage);
    const onCustom = (e: any) => {
      try {
        const raw = localStorage.getItem("cart");
        if (raw) {
          const parsed = JSON.parse(raw) as Array<any>;
          setBadgeCount(parsed.length);
        } else {
          setBadgeCount(0);
        }
      } catch (err) {}
    };
    window.addEventListener("cart:updated", onCustom as EventListener);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { user, hasRole, signOut, isLoggedIn } = useAuth();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const getLangShort = (lang: Language) =>
    lang === "rw" ? "KIN" : lang.toUpperCase();
  const getLangFull = (lang: Language) =>
    lang === "rw" ? t("language.rw") : t("language.en");

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Successfully logged out");
      router.push("/");
    } catch (error) {
      toast.error("Error logging out");
    }
  };

  return (
    <div className="sticky top-0 w-full z-[998] bg-white border shadow-md">
      <MaxWidthWrapper
        size={"lg"}
        className="w-full flex items-center justify-between py-2"
      >
        {/* Logo */}
        <Link href="/">
          <Image
            src={logo}
            alt="nihemart logo"
            priority
            className="md:w-14 w-10 md:h-16 h-12 object-contain"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-4">
          {routes.map(({ url, name }, i) => (
            <Link
              key={i}
              href={url}
              className={cn(
                "relative text-slate-500 font-semibold after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-brand-orange after:transition-transform after:duration-300 hover:after:origin-bottom-left hover:after:scale-x-100"
              )}
            >
              {t(name)}
            </Link>
          ))}
        </div>

        {/* Desktop Search */}
        <div className="hidden md:block w-[25%]">
          <SearchPopover />
        </div>

        {/* Mobile Search (toggle) */}
        <div className="flex items-center md:gap-2 gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMobileSearch((prev) => !prev)}
            className="md:hidden hover:bg-orange-100"
            aria-label="Toggle search"
          >
            <Search className="h-5 w-5 text-slate-700" />
          </Button>

          {showMobileSearch && (
            <div className="absolute top-full left-0 w-full bg-white border-t shadow-md px-4 py-2 z-[999] md:hidden">
              <SearchPopover />
            </div>
          )}

          {/* <Button
                  aria-label={t("nav.language") || "Select language"}
                  className="flex lg:items-center bg-white text-orange-500 hover:bg-white/90 outline-none border-none"
               >
                  <Globe className="h-4 w-4" />
                  <span className="hidden lg:flex">{getLangFull(language)}</span>
                  <span className="lg:hidden">{getLangShort(language)}</span>
               </Button> */}

          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label="Cart"
            className="hover:bg-blue-500 group"
          >
            <Link href={"/cart"} className="relative">
              <ShoppingCart className="h-5 w-5 text-slate-700 group-hover:text-white transition-colors duration-200" />
              <Badge
                className={`absolute -top-2 -right-2 h-5 w-5 rounded-full text-xs p-0 flex items-center justify-center bg-orange-400 outline-none z-10 ${
                  !mounted || badgeCount === 0
                    ? "opacity-0 pointer-events-none"
                    : "opacity-100"
                }`}
              >
                <span suppressHydrationWarning>
                  {mounted && badgeCount > 0 ? badgeCount : ""}
                </span>
              </Badge>
            </Link>
          </Button>

          {/* Notifications (show only when logged in) */}
          {isLoggedIn && <NotificationsBell />}

          {/* Desktop ellipsis menu (always present on large screens). */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="More options"
                className={cn(
                  "hidden lg:inline-flex p-2 text-slate-700 focus:outline-none focus:ring-0"
                )}
              >
                <EllipsisVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[9999]">
              <DropdownMenuItem asChild>
                <Link href="/about">{t("nav.about")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/returns">{t("nav.returns")}</Link>
              </DropdownMenuItem>
              {!user && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/signin">{t("nav.login")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/signup">{t("nav.register")}</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Avatar menu: visible only when logged in (appears beside ellipsis on desktop). */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="User menu"
                  className={cn(
                    "inline-flex p-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 hover:bg-transparent"
                  )}
                >
                  <Avatar
                    className={cn(
                      "bg-black/5 backdrop-blur-sm hover:bg-black/20 transition-colors duration-150 border border-white/5"
                    )}
                  >
                    {(user.user_metadata as any)?.avatar_url ? (
                      <AvatarImage
                        src={(user.user_metadata as any).avatar_url}
                        alt={
                          (user.user_metadata as any)?.full_name ||
                          user.email ||
                          "User"
                        }
                      />
                    ) : (
                      <AvatarFallback className="text-sm font-medium">
                        {(
                          (user.user_metadata as any)?.full_name ||
                          user.email ||
                          ""
                        )
                          .slice(0, 1)
                          .toUpperCase() || (
                          <User className="h-4 w-4 text-slate-700" />
                        )}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="z-[9999]">
                <DropdownMenuItem asChild>
                  <Link href={"/profile"}>{t("nav.profile")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={"/wishlist"}>{t("nav.wishlist")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={"/orders"}>{t("nav.orders")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={"/notifications"}>{t("nav.notifications")}</Link>
                </DropdownMenuItem>

                {hasRole("admin") && (
                  <DropdownMenuItem asChild>
                    <Link href={"/admin"}>{t("nav.admin")}</Link>
                  </DropdownMenuItem>
                )}

                {hasRole("rider") && (
                  <DropdownMenuItem asChild>
                    <Link href={"/rider"}>{t("nav.rider")}</Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="relative px-2 lg:hidden bg-brand-blue hover:bg-brand-blue/90 ml-1">
                <Menu />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 z-[9999]"
              align="end"
              sideOffset={10}
              forceMount
            >
              {user ? (
                <div className="px-4 py-3 border-b">
                  <div className="text-sm text-text-secondary">
                    {t("nav.hello") || "Hello"},
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-text-primary truncate">
                    {(user.user_metadata as any)?.full_name || user.email}
                  </div>
                </div>
              ) : null}

              {mobileRoutes.map(({ name, url }, index) => (
                <DropdownMenuItem key={index} asChild className="border-b">
                  <Link href={url}>{t(name)}</Link>
                </DropdownMenuItem>
              ))}
              {/* show different mobile menu items depending on auth state */}
              {user ? (
                <>
                  <div className="px-2 py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label={t("nav.language") || "Select language"}
                          className="bg-orange-500 hover:bg-orange-500/90 w-full mt-2 flex items-center justify-center gap-2"
                        >
                          <Globe className="h-4 w-4" />
                          <span className="hidden lg:flex">
                            {getLangFull(language)}
                          </span>
                          <span className="lg:hidden">
                            {getLangShort(language)}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="z-[9999]">
                        <DropdownMenuItem
                          onClick={() => handleLanguageChange("en")}
                        >
                          English
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleLanguageChange("rw")}
                        >
                          Kinyarwanda
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              ) : (
                <>
                  {/* Login/Register Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-label="Login or Register"
                        className="bg-orange-500 hover:bg-orange-500/90 w-full mt-2 flex items-center justify-center gap-2"
                      >
                        <User className="h-4 w-4" />
                        <span>
                          {t("nav.login")}/{t("nav.register")}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="z-[9999]">
                      <DropdownMenuItem asChild>
                        <Link href="/signin">{t("nav.login")}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/signup">{t("nav.register")}</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </MaxWidthWrapper>
    </div>
  );
};

export default NavBar;
