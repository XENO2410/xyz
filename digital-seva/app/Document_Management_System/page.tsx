// digital-seva\app\Document_Management_System\page.tsx
'use client';

import { Suspense } from 'react';
import { DocumentVerification } from "../components/DocumentVerification";
import Navbar from "../components/Navbar";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/lib/TranslationContext";

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 mt-4">
        <button
          onClick={() => router.push("/")}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          {t("backtohome")}
        </button>
      </div>
      <div className="p-4">
        <Suspense fallback={<div>Loading...</div>}>
          <DocumentVerification />
        </Suspense>
      </div>
    </div>
  );
}
