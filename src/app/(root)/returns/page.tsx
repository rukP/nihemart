"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react"; // ✅ simple nice tick icon

const ReturnAndRefundPolicy = () => {
  const { t } = useLanguage();

  const ListItem = ({ text }: { text: string }) => (
    <li className="flex items-start gap-3">
      <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
      <span>{text}</span>
    </li>
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 to-blue-600 py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-lg">
            {t("returnTitle")}
          </h1>
          <p className="text-base md:text-lg text-white/90 max-w-3xl mx-auto leading-relaxed">
            {t("returnHero")}
          </p>
        </div>
      </section>

      {/* Terms Section */}
      <section className="px-4 md:px-8 lg:px-16 py-12 bg-white">
        <div className="container mx-auto">
          <Card className="shadow-xl rounded-2xl border border-gray-100">
            <CardContent className="p-6 md:p-10">
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
                {t("termsTitle")}
              </h2>
              <ul className="space-y-4 text-gray-700 text-base leading-relaxed">
                <ListItem text={t("termsCondition1Desc")} />
                <ListItem text={t("termsCondition2Desc")} />
                <ListItem text={t("termsCondition3Desc")} />
                {/* <ListItem text={t("termsCondition4Desc")} />
                <ListItem text={t("termsCondition5Desc")} /> */}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Refund Section */}
      <section className="px-4 md:px-8 lg:px-16 py-12 bg-neutral-100">
        <div className="container mx-auto">
          <Card className="shadow-xl rounded-2xl border border-gray-100">
            <CardContent className="p-6 md:p-10">
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
                {t("refundTitle")}
              </h2>
              <ul className="space-y-4 text-gray-700 text-base leading-relaxed">
                <ListItem text={t("refundCondition1Desc")} />
                <ListItem text={t("refundCondition2Desc")} />
                <ListItem text={t("refundCondition3Desc")} />
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section className="px-4 md:px-8 lg:px-16 py-16 bg-white">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
            {t("contactTitle")}
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t("contactDesc")}
          </p>
          <p className="text-base md:text-lg text-gray-800">
            <span className="font-medium">{t("supportEmailLabel")}:</span>{" "}
            <a
              href="mailto:nihemart@gmail.com"
              className="text-blue-600 hover:underline hover:text-blue-800 transition-colors"
            >
              nihemart@gmail.com
            </a>
          </p>
          <p className="text-base md:text-lg text-gray-800">
            <span className="font-medium">{t("supportPhoneLabel")}:</span>{" "}
            <a
              href="tel:+250792412177"
              className="text-blue-600 hover:underline hover:text-blue-800 transition-colors"
            >
              +250 792 412 177
            </a>
          </p>
        </div>
      </section>
    </div>
  );
};

export default ReturnAndRefundPolicy;