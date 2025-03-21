// digital-seva\app\footer.tsx
import { useTranslation } from "@/app/lib/TranslationContext";

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-background border-t py-4">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground space-y-2 md:space-y-0">
          <div className="font-medium">{t("EYTechathon")}</div>
        <div className="font-semibold">{t("teamScavengers")}</div>
      </div>
    </footer>
  );
};

export default Footer;

  