// digital-seva\app\Nithya\page.tsx
"use client";

import { Nithya } from "../components/Nithya";
import Navbar from "../components/Navbar";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/lib/TranslationContext";

export default function NithyaPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Back Button */}
      <div className="container mx-auto px-4 mt-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition duration-300"
          aria-label="Back to Home"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-lg font-medium">{t("backtohome")}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <Nithya />
      </div>
    </div>
  );
}
