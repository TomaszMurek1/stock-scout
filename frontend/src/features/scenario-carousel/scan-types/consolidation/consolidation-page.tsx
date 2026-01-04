import React from "react";
import { useTranslation, Trans } from "react-i18next";
import FormCardGenerator from "@/components/shared/forms/form-card-generator";
import FormSubtitle from "@/components/shared/forms/FormSubtitle";
import BreakoutForm from "../breakout-form/breakout-form";
import BackToCarousel from "@/components/shared/BackToCarousel";
import { Minus } from "lucide-react";

export default function ConsolidationPage() {
  const { t } = useTranslation();
  return (
    <div className="container">
      <BackToCarousel />
      <FormCardGenerator
      title={t("scans.consolidation.title")}
      icon={Minus}
      subtitle={
        <FormSubtitle
          description={
            <Trans i18nKey="scans.consolidation.subtitle_desc">
              Find stocks that have been <strong>consolidating</strong> (trading in a tight range) and are ready for a potential <strong>breakout</strong>.
            </Trans>
          }
          bulletPoints={[
            {
              label: t("scans.consolidation.bullets.period.label"),
              description: t("scans.consolidation.bullets.period.description"),
            },
            {
              label: t("scans.consolidation.bullets.breakout.label"),
              description: t("scans.consolidation.bullets.breakout.description"),
            },
            {
              label: t("scans.consolidation.bullets.volume.label"),
              description: t("scans.consolidation.bullets.volume.description"),
            },
            {
              label: t("scans.consolidation.bullets.matter.label"),
              description: t("scans.consolidation.bullets.matter.description"),
            },
          ]}
        />
      }
    >
      <BreakoutForm />
    </FormCardGenerator>
    </div>
  );
}
