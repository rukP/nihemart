"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Search, CreditCard, Truck, Package } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const Page = () => {
  const { t } = useLanguage();

  const steps = [
    {
      id: 1,
      title: t("howToBuy.step1.title"),
      description: t("howToBuy.step1.desc"),
      icon: <Search className="w-8 h-8 text-white" />,
    },
    {
      id: 2,
      title: t("howToBuy.step2.title"),
      description: t("howToBuy.step2.desc"),
      icon: <ShoppingCart className="w-8 h-8 text-white" />,
    },
    {
      id: 3,
      title: t("howToBuy.step3.title"),
      description: t("howToBuy.step3.desc"),
      icon: <Package className="w-8 h-8 text-white" />,
    },
    {
      id: 4,
      title: t("howToBuy.step4.title"),
      description: t("howToBuy.step4.desc"),
      icon: <CreditCard className="w-8 h-8 text-white" />,
    },
    {
      id: 5,
      title: t("howToBuy.step5.title"),
      description: t("howToBuy.step5.desc"),
      icon: <Truck className="w-8 h-8 text-white" />,
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-orange-500 to-blue-500 text-white py-20">
        <div className="max-w-5xl mx-auto text-center px-4">
          <h1 className="text-4xl font-bold mb-4">{t("howToBuy.title")}</h1>
          <p className="text-lg text-white/90">{t("howToBuy.subtitle")}</p>
        </div>
      </section>

      {/* Steps Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 bg-muted/30">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
            >
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-2xl">
                <CardHeader className="flex flex-col items-center space-y-3">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-500">
                    {step.icon}
                  </div>
                  <CardTitle className="text-xl text-center text-primary">
                    {step.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-neutral-600">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <Separator className="max-w-4xl mx-auto" />

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto text-center py-20 px-4">
        <h2 className="text-3xl font-bold mb-6">{t("howToBuy.ctaTitle")}</h2>
        <p className="text-neutral-600 mb-8">{t("howToBuy.ctaSubtitle")}</p>
        <Button size="lg" className="rounded-full px-8">
          {t("howToBuy.ctaButton")}
        </Button>
      </section>
    </div>
  );
};

export default Page;
