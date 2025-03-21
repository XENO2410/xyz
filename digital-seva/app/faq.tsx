"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useTranslation } from "@/app/lib/TranslationContext";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQSection = () => {
  const { t } = useTranslation(); // ✅ Moved inside the component

  const faqData: FAQItem[] = [
    { 
      question: t("faq1"), 
      answer: t("faq1Desc")
    },
    { 
      question: t("faq2"), 
      answer: t("faq2Desc")
    },
    { 
      question: t("faq3"), 
      answer: t("faq3Desc")
    },
    { 
      question: t("faq4"), 
      answer: t("faq4Desc")
    },
    { 
      question: t("faq5"), 
      answer: t("faq5Desc")
    }
  ];

  return (
    <section className="w-full max-w-4xl mx-auto py-16 px-6">
      {/* Section Title */}
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t("faq")}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
          {t("faqDesc")}
        </p>
      </div>
      
      {/* FAQ Accordion */}
      <Accordion type="single" collapsible className="w-full space-y-4">
        {faqData.map((item, index) => (
          <AccordionItem 
            key={index} 
            value={`item-${index}`}
            className="border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all"
          >
            <AccordionTrigger className="text-left text-lg font-medium py-4 px-6 text-gray-900 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-gray-700 dark:text-gray-300 px-6 pb-4 leading-relaxed">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default FAQSection;
