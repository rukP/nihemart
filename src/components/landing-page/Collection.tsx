"use client";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { optimizeImageUrl } from "@/lib/utils";
import { FC, RefObject, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchCategoriesLight } from "@/integrations/supabase/categories";
import type { CategoryLight } from "@/integrations/supabase/categories";
import { useLanguage } from "@/contexts/LanguageContext";
import MaxWidthWrapper from "../MaxWidthWrapper";

interface CollectionProps {}

const Collection: FC<CollectionProps> = ({}) => {
  const { t } = useLanguage();

  const [categories, setCategories] = useState<CategoryLight[]>([]);
  const [loading, setLoading] = useState(true);
  const [chevAppear, setChevApp] = useState<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });
  const sliderRef: RefObject<HTMLDivElement | null> = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // current page for mobile indicators
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      try {
        // Fetching categories for the landing page
        const data = await fetchCategoriesLight();
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  // reset current page when categories change
  useEffect(() => {
    setCurrentPage(0);
    if (sliderRef.current) {
      sliderRef.current.scrollLeft = 0;
    }
  }, [categories.length]);

  // track mobile breakpoint
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSliderScroll = () => {
    const slider = sliderRef.current;
    if (!slider) return;

    const scrollWidth = slider.scrollLeft + slider.offsetWidth;
    const isLeft = slider.scrollLeft > 2;
    const isRight = scrollWidth < slider.scrollWidth - 2; // small buffer

    setChevApp({ left: isLeft, right: isRight });

    if (isMobile) {
      const page = Math.round(slider.scrollLeft / slider.offsetWidth);
      setCurrentPage(page);
    }
  };

  const handleLeftChevClick = () => {
    const slider = sliderRef.current;
    if (!slider) return;

    if (isMobile) {
      // move by one full page (viewport width of slider)
      slider.scrollTo({
        left: Math.max(0, slider.scrollLeft - slider.offsetWidth),
        behavior: "smooth",
      });
    } else {
      slider.scrollLeft -= 320; // Card width (w-80 = 320px) + gap
    }
  };

  const handleRightChevClick = () => {
    const slider = sliderRef.current;
    if (!slider) return;

    if (isMobile) {
      slider.scrollTo({
        left: slider.scrollLeft + slider.offsetWidth,
        behavior: "smooth",
      });
    } else {
      slider.scrollLeft += 320;
    }
  };

  // programmatic page jump for indicators
  const scrollToPage = (pageIndex: number) => {
    const slider = sliderRef.current;
    if (!slider) return;
    const left = pageIndex * slider.offsetWidth;
    slider.scrollTo({ left, behavior: "smooth" });
    setCurrentPage(pageIndex);
  };

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || loading) return;

    const checkChevrons = () => {
      if (slider.scrollWidth > slider.offsetWidth) {
        handleSliderScroll();
      } else {
        setChevApp({ left: false, right: false });
      }
    };

    // Initial check
    checkChevrons();

    // Check on window resize
    window.addEventListener("resize", checkChevrons);

    return () => window.removeEventListener("resize", checkChevrons);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, categories, isMobile]);

  // chunk helper for mobile pages
  const chunkArray = <T,>(arr: T[], size: number) => {
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      res.push(arr.slice(i, i + size));
    }
    return res;
  };

  // build pages for mobile (4 items per page)
  const mobilePages = chunkArray(categories, 4);

  return (
    <MaxWidthWrapper size={"lg"} className="">
      <div className="my-5 lg:my-10 relative">
        <h1 className="lg:text-4xl md:text-2xl text-xl font-bold text-neutral-900 mb-5">
          {t("home.categories")}
        </h1>

        {/* Slider container */}
        <div
          className={cn(
            "flex overflow-x-scroll scroll-smooth gap-2 md:gap-3 scrollbar-hidden",
            { "snap-x snap-mandatory": isMobile }
          )}
          ref={sliderRef}
          onScroll={handleSliderScroll}
        >
          {loading
            ? // Loading placeholders
              isMobile
              ? // show 2 placeholder pages on mobile
                Array(2)
                  .fill(0)
                  .map((_, pageIdx) => (
                    <div
                      key={pageIdx}
                      className="min-w-full snap-start grid grid-cols-2 grid-rows-2 gap-2"
                    >
                      {Array(4)
                        .fill(0)
                        .map((__, i) => (
                          <div
                            key={i}
                            className="w-full h-32 md:h-60 bg-gray-200 rounded-2xl animate-pulse"
                          />
                        ))}
                    </div>
                  ))
              : // desktop single row placeholders
                Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="w-56 md:w-60 h-60 shrink-0 aspect-[9/12] bg-gray-200 rounded-2xl animate-pulse"
                    />
                  ))
            : isMobile
              ? // Mobile: pages with 2 rows x 2 cols per page
                mobilePages.map((page, pageIndex) => (
                  <div
                    key={pageIndex}
                    className="min-w-full snap-start grid grid-cols-2 grid-rows-2 gap-2"
                    aria-hidden="false"
                  >
                    {page.map((category) => (
                      <Link
                        href={`/products?categories=${category.id}`}
                        key={category.id}
                        className="w-full h-32 md:h-40 border-2 border-blue-100 rounded-lg flex flex-col items-center justify-center group hover:border-orange-200 transition-colors p-2"
                      >
                        <Image
                          src={optimizeImageUrl(
                            category.icon_url || "/placeholder.svg",
                            {
                              width: 160,
                              quality: 75,
                            }
                          )}
                          alt={category.name}
                          width={80}
                          height={80}
                          className="group-hover:scale-105 transition-transform duration-300 mb-2"
                          // priority
                          // loading="eager"
                        />
                        <h4 className="text-center font-medium text-gray-800 group-hover:text-orange-600 transition-colors px-2 truncate text-sm">
                          {category.name}
                        </h4>
                      </Link>
                    ))}

                    {/* If last page has <4 items, fill empty slots so layout remains consistent */}
                    {page.length < 4 &&
                      Array(4 - page.length)
                        .fill(0)
                        .map((_, idx) => (
                          <div
                            key={`empty-${idx}`}
                            className="w-full h-32 md:h-40 border-2 border-transparent rounded-lg"
                            aria-hidden="true"
                          />
                        ))}
                  </div>
                ))
              : // Desktop / large screens: single row slider as before
                categories.map((category) => (
                  <Link
                    href={`/products?categories=${category.id}`}
                    key={category.id}
                    className="lg:w-60 w-52 h-48 lg:h-60 border-2 border-blue-100 rounded-lg shrink-0 flex flex-col items-center justify-center group hover:border-orange-200 transition-colors"
                  >
                    <Image
                      src={optimizeImageUrl(
                        category.icon_url || "/placeholder.svg",
                        {
                          width: 240,
                          quality: 80,
                        }
                      )}
                      alt={category.name}
                      width={120}
                      height={120}
                      className="group-hover:scale-105 transition-transform duration-300 mb-3"
                      priority
                    />
                    <h4 className="text-center font-medium text-gray-800 group-hover:text-orange-600 transition-colors px-2 truncate">
                      {category.name}
                    </h4>
                  </Link>
                ))}
        </div>

        {/* Mobile page indicators */}
        {!loading && isMobile && mobilePages.length > 1 && (
          <div className="flex justify-center mt-3 gap-2">
            {mobilePages.map((_, idx) => (
              <button
                key={`dot-${idx}`}
                onClick={() => scrollToPage(idx)}
                aria-current={currentPage === idx ? "true" : "false"}
                aria-label={`Go to page ${idx + 1}`}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  currentPage === idx ? "bg-orange-500" : "bg-neutral-400/50"
                )}
              />
            ))}
          </div>
        )}

        {!loading && (
          <div className="absolute inset-x-3 xs:inset-x-5 sm:inset-x-10 lg:inset-x-20 z-20 flex items-center justify-between top-1/2 -translate-y-1/2 pointer-events-none">
            <button
              onClick={handleLeftChevClick}
              title="Scroll left"
              aria-label="Scroll left"
              className={cn(
                "text-black bg-white/80 backdrop-blur-sm border border-neutral-300 transition-all duration-300 rounded-full p-2 cursor-pointer pointer-events-auto",
                {
                  "opacity-0 scale-50": !chevAppear.left,
                  "opacity-100 scale-100 hover:bg-white": chevAppear.left,
                }
              )}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleRightChevClick}
              title="Scroll right"
              aria-label="Scroll right"
              className={cn(
                "text-black bg-white/80 backdrop-blur-sm border border-neutral-300 transition-all duration-300 rounded-full p-2 cursor-pointer pointer-events-auto",
                {
                  "opacity-0 scale-50": !chevAppear.right,
                  "opacity-100 scale-100 hover:bg-white": chevAppear.right,
                }
              )}
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}
      </div>
    </MaxWidthWrapper>
  );
};

export default Collection;
