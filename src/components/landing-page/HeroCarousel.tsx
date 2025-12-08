"use client";

import {
  carousel1,
  carousel2,
  carousel3,
  carousel4,
  carousel5,
} from "@/assets";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { Button } from "../ui/button";
import MaxWidthWrapper from "../MaxWidthWrapper";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HeroCarousel() {
  const { t } = useLanguage();

  const carouselContent = [
    {
      image: carousel1,
      heading: t("hero.slide1.title"),
      description: t("hero.slide1.subtitle"),
      buttonText: t("hero.slide1.button"),
    },
    {
      image: carousel2,
      heading: t("hero.slide2.title"),
      description: t("hero.slide2.subtitle"),
      buttonText: t("hero.slide2.button"),
    },
    {
      image: carousel3,
      heading: t("hero.slide3.title"),
      description: t("hero.slide3.subtitle"),
      buttonText: t("hero.slide3.button"),
    },
    {
      image: carousel4,
      heading: t("hero.slide4.title"),
      description: t("hero.slide4.subtitle"),
      buttonText: t("hero.slide4.button"),
    },
    {
      image: carousel5,
      heading: t("hero.slide5.title"),
      description: t("hero.slide5.subtitle"),
      buttonText: t("hero.slide5.button"),
    },
  ];

  return (
    <MaxWidthWrapper size={"lg"} className="lg:mt-10 my-3 pb-2">
      <div className="relative">
        <Carousel opts={{ loop: true }} plugins={[Autoplay()]}>
          <CarouselContent className="mb-3">
            {carouselContent.map((slide, index) => (
              <CarouselItem key={index} className="basis-[100%] sm:basis-[90%]">
                {/* 👇 Adjusted height for different screen sizes */}
                <div className="relative h-[45vh] sm:h-[55vh] md:h-[70vh] lg:h-[85vh] rounded-2xl overflow-hidden">
                  <Image
                    className="w-full h-full object-cover absolute inset-0 z-0"
                    alt={slide.heading}
                    priority={index === 0}
                    loading={index === 0 ? "eager" : "lazy"}
                    src={slide.image}
                    height={800}
                    width={1200}
                    quality={85}
                    placeholder="blur"
                  />
                  <div className="relative h-full z-10 bg-gradient-to-t from-[#36A9EC] to-transparent flex flex-col p-4 md:p-10">
                    <div className="mt-auto mb-10 sm:mb-16 px-4 sm:px-8 md:px-20 flex flex-col md:flex-row justify-between md:items-center gap-4 md:gap-10">
                      <div className="flex flex-col gap-2 md:gap-4">
                        <h3 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl text-white font-semibold leading-tight">
                          {slide.heading}
                        </h3>
                        <p className="text-white text-sm sm:text-base md:text-lg lg:text-xl max-w-lg">
                          {slide.description}
                        </p>
                      </div>
                      <Link href="/products">
                        <Button
                          className="bg-brand-orange text-white hover:bg-brand-orange/90 rounded-full w-full sm:w-fit"
                          size="lg"
                        >
                          {slide.buttonText}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselNext className="top-[85%] md:top-[90%] left-[85%] md:left-[90%] bg-transparent text-white hover:text-[#36A9EC]" />
          <CarouselPrevious className="top-[85%] md:top-[90%] left-[10%] bg-transparent text-white hover:text-[#36A9EC]" />
          <CarouselDots className="mt-2" />
        </Carousel>
      </div>
    </MaxWidthWrapper>
  );
}