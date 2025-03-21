// digital-seva\app\bookmarks\page.tsx
"use client";

import BookmarkComponent from "../components/BookmarkComponent";
import Navbar from "../components/Navbar";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/lib/TranslationContext";
 
export default function BookmarkPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <BookmarkComponent />
      </div>
  );
}
