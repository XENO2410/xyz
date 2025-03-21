// digital-seva\app\components\SchemeApplication.tsx
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/app/lib/TranslationContext";

interface SchemeApplicationProps {
  scheme: any;
  onClose: () => void;
}

const SchemeApplication = ({ scheme, onClose }: SchemeApplicationProps) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{t("applyfor")} {scheme.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{scheme.description}</p>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <p>{t("eligibility")}: {scheme.eligibility}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <p>{t("benefit")}: {scheme.benefit}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <p>{t("deadline")}: {scheme.deadline}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <p>{t("beneficiaries")}: {scheme.beneficiaries}</p>
          </div>
          <div className="mt-6">
            <p className="font-semibold text-gray-700 mb-2">{t("requireddocuments")}:</p>
            <ul className="list-disc list-inside text-sm text-gray-600">
              {scheme.documents.map((doc: string, index: number) => (
                <li key={index}>{doc}</li>
              ))}
            </ul>
          </div>
          <div className="flex gap-4 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded"
            >
              {t("close")}
            </button>
            <a
              href={scheme.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 text-white w-full py-2 rounded-lg font-semibold text-sm hover:bg-green-700 transition duration-200 text-center"
            >
              {t("applynow")}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchemeApplication;