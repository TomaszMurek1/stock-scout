import React from "react";
import { useTranslation, Trans } from "react-i18next";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import FormSubtitle from "@/components/shared/forms/FormSubtitle";
import GmmaSqueezeForm from "./gmma-squeeze-form";
import BackToCarousel from "@/components/shared/BackToCarousel";
import { Activity } from "lucide-react";

export default function GmmaSqueezePage() {
  const { t } = useTranslation();
  return (
    <div data-id="gmma-squeeze-page" className="container">
      <BackToCarousel />
      <FormCardGenerator
        title={t("scans.gmma_squeeze.title")}
        icon={Activity}
        maxWidth="max-w-4xl"
        subtitle={
          <FormSubtitle
            description={
              <Trans i18nKey="scans.gmma_squeeze.subtitle_desc">
                Detect <strong>GMMA compression breakouts</strong> using the
                Borawski Volatility Squeeze method. Identifies stocks where
                24 EMA lines compress and then expand with a
                <strong> bullish breakout</strong>.
              </Trans>
            }
            bulletPoints={[
              {
                label: t("scans.gmma_squeeze.bullets.gmma.label"),
                description: t(
                  "scans.gmma_squeeze.bullets.gmma.description"
                ),
              },
              {
                label: t("scans.gmma_squeeze.bullets.squeeze.label"),
                description: t(
                  "scans.gmma_squeeze.bullets.squeeze.description"
                ),
              },
              {
                label: t("scans.gmma_squeeze.bullets.breakout.label"),
                description: t(
                  "scans.gmma_squeeze.bullets.breakout.description"
                ),
              },
              {
                label: t("scans.gmma_squeeze.bullets.trend.label"),
                description: t(
                  "scans.gmma_squeeze.bullets.trend.description"
                ),
              },
            ]}
          />
        }
      >
        <GmmaSqueezeForm />
      </FormCardGenerator>
    </div>
  );
}
