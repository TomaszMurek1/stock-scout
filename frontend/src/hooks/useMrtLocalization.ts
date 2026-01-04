
import { MRT_Localization_EN } from 'material-react-table/locales/en';
import { MRT_Localization_PL } from 'material-react-table/locales/pl';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

export const useMrtLocalization = () => {
  const { i18n } = useTranslation();

  return useMemo(() => {
    return i18n.language === 'pl' ? MRT_Localization_PL : MRT_Localization_EN;
  }, [i18n.language]);
};
