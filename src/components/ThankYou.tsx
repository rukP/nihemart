"use client";
import React from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

type ThankYouProps = {
  message?: string;
};

const ThankYou: React.FC<ThankYouProps> = ({ message }) => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-orange-50">
      {/* Animated Background SVGs */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Floating circles */}
        <circle cx="10%" cy="20%" r="60" fill="url(#grad1)">
          <animate
            attributeName="cy"
            values="20%;25%;20%"
            dur="4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="cx"
            values="10%;12%;10%"
            dur="5s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="85%" cy="15%" r="40" fill="url(#grad2)">
          <animate
            attributeName="cy"
            values="15%;20%;15%"
            dur="3.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="cx"
            values="85%;83%;85%"
            dur="4.5s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="75%" cy="80%" r="80" fill="url(#grad1)">
          <animate
            attributeName="cy"
            values="80%;75%;80%"
            dur="5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="cx"
            values="75%;78%;75%"
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="20%" cy="75%" r="50" fill="url(#grad2)">
          <animate
            attributeName="cy"
            values="75%;70%;75%"
            dur="4.5s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="50%" cy="90%" r="35" fill="url(#grad1)">
          <animate
            attributeName="cy"
            values="90%;85%;90%"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="90%" cy="50%" r="45" fill="url(#grad2)">
          <animate
            attributeName="cx"
            values="90%;88%;90%"
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Animated shopping bags */}
        <g transform="translate(5%, 45%)" opacity="0.15">
          <animate
            attributeName="opacity"
            values="0.15;0.25;0.15"
            dur="3s"
            repeatCount="indefinite"
          />
          <path
            d="M0 15 L5 15 L5 0 L35 0 L35 15 L40 15 L40 50 L0 50 Z"
            fill="#0ea5e9"
          />
          <path
            d="M10 0 Q10 -10 20 -10 Q30 -10 30 0"
            stroke="#0ea5e9"
            strokeWidth="3"
            fill="none"
          />
        </g>
        <g transform="translate(88%, 60%)" opacity="0.12">
          <animate
            attributeName="opacity"
            values="0.12;0.2;0.12"
            dur="4s"
            repeatCount="indefinite"
          />
          <path
            d="M0 12 L4 12 L4 0 L28 0 L28 12 L32 12 L32 40 L0 40 Z"
            fill="#f97316"
          />
          <path
            d="M8 0 Q8 -8 16 -8 Q24 -8 24 0"
            stroke="#f97316"
            strokeWidth="2.5"
            fill="none"
          />
        </g>

        {/* Decorative waves */}
        <path
          d="M0 100 Q250 50 500 100 T1000 100 V150 H0 Z"
          fill="url(#grad1)"
          opacity="0.3"
        >
          <animate
            attributeName="d"
            values="M0 100 Q250 50 500 100 T1000 100 V150 H0 Z;M0 100 Q250 150 500 100 T1000 100 V150 H0 Z;M0 100 Q250 50 500 100 T1000 100 V150 H0 Z"
            dur="8s"
            repeatCount="indefinite"
          />
        </path>
      </svg>

      {/* Sparkle particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: `${10 + i * 7.5}%`,
              top: `${15 + (i % 4) * 20}%`,
              background: i % 2 === 0 ? "#38bdf8" : "#fb923c",
              animation: `pulse 2s ease-in-out ${
                i * 0.2
              }s infinite, float ${3 + (i % 3)}s ease-in-out ${
                i * 0.3
              }s infinite`,
            }}
          />
        ))}
      </div>

      {/* Main Content Card */}
      <div className="relative z-10 max-w-lg mx-4 w-full">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-sky-200/50 p-10 border border-white/50">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center shadow-lg shadow-sky-300/50">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path
                    className="checkmark-path"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              {/* Animated rings */}
              <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-sky-300 opacity-50 animate-ping" />
              <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-orange-300 opacity-30 animate-ping" />
            </div>
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-sky-500">Nihe</span>
              <span className="text-2xl font-bold text-orange-500">Mart</span>
            </div>
          </div>

          {/* Thank You Text */}
          <h1 className="text-3xl font-bold text-center mb-3 bg-gradient-to-r from-sky-600 via-sky-500 to-orange-500 bg-clip-text text-transparent">
            {t("thankYou.title")}
          </h1>

          <div className="text-center mb-6">
            <p className="text-gray-700 mb-4 leading-relaxed">
              {t("thankYou.orderReceived")}
            </p>

            <div className="inline-block bg-white/60 px-4 py-3 rounded-xl border border-sky-100 shadow-sm">
              <p className="text-sm text-gray-600 mb-2">
                {t("thankYou.contactPrompt")}
              </p>
              <div className="flex items-center justify-center gap-4">
                <a
                  href={`tel:+250792412177`}
                  className="text-sky-600 font-medium"
                  aria-label="Call Nihemart"
                >
                  {t("thankYou.contact.number")}
                </a>
                <span className="text-gray-300">|</span>
                <a
                  href={`https://wa.me/250792412177`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 font-medium"
                  aria-label="Message Nihemart on WhatsApp"
                >
                  {t("thankYou.contact.whatsapp")}
                </a>
              </div>
            </div>
          </div>

          {/* Order status visual */}
          <div className="bg-gradient-to-r from-sky-50 to-orange-50 rounded-2xl p-5 mb-6 border border-sky-100">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-sky-400 animate-pulse" />
                <span className="text-sm text-gray-600">
                  {t("thankYou.orderPlaced")}
                </span>
              </div>
              <div className="h-px w-8 bg-gradient-to-r from-sky-300 to-orange-300" />
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-300" />
                <span className="text-sm text-gray-500">
                  {t("thankYou.processing")}
                </span>
              </div>
              <div className="h-px w-8 bg-gray-200" />
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-200" />
                <span className="text-sm text-gray-400">
                  {t("thankYou.delivered")}
                </span>
              </div>
            </div>
          </div>

          {/* Account creation / benefits */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 mb-6 border border-sky-50">
            <h2 className="text-lg font-semibold text-sky-600 mb-2">
              {t("thankYou.createAccount.title")}
            </h2>
            <p className="text-gray-600 mb-3">
              {t("thankYou.createAccount.intro")}
            </p>
            <h3 className="font-medium text-gray-700 mb-2">
              {t("thankYou.createAccount.benefits.title")}
            </h3>
            <ul className="text-sm text-gray-600 space-y-2 mb-4 list-inside list-disc">
              <li>{t("thankYou.createAccount.benefits.1")}</li>
              <li>{t("thankYou.createAccount.benefits.2")}</li>
              <li>{t("thankYou.createAccount.benefits.3")}</li>
              <li>{t("thankYou.createAccount.benefits.4")}</li>
              <li>{t("thankYou.createAccount.benefits.5")}</li>
              <li>{t("thankYou.createAccount.benefits.6")}</li>
            </ul>
            <div className="flex gap-3 justify-center">
              <Link
                href="/signup"
                className="rounded-lg bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 font-semibold"
              >
                {t("thankYou.createAccount.cta")}
              </Link>
              <Link
                href="/signin"
                className="rounded-lg border border-sky-200 px-4 py-2 text-sky-600 font-medium"
              >
                {t("thankYou.createAccount.registerLink")}
              </Link>
            </div>
          </div>

          {/* Refund policy */}
          <div className="text-sm text-gray-600 mb-4 text-center">
            <strong className="text-gray-700">
              {t("thankYou.refundPolicy.title")}:
            </strong>
            <p className="mt-2">{t("thankYou.refundPolicy.text")}</p>
          </div>

          {/* Continue Shopping Button */}
          <Link
            href="/products"
            className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 p-px transition-all duration-300 hover:shadow-xl hover:shadow-sky-300/40 hover:scale-[1.02] active:scale-[0.98]"
            aria-label={t("thankYou.continueShopping")}
          >
            <div className="relative flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 px-8 py-4 transition-all">
              <span className="text-lg font-semibold text-white">
                {t("thankYou.continueShopping")}
              </span>
              <svg
                className="w-5 h-5 text-white transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </div>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700" />
          </Link>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes checkmark {
          0% { stroke-dashoffset: 30; }
          100% { stroke-dashoffset: 0; }
        }
       .checkmark-path {
          stroke-dasharray: 30;
          stroke-dashoffset: 30;
          animation: checkmark 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ThankYou;
