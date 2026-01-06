import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-white py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <p>{t("footer.copyright", { year: currentYear })}</p>
        <ul className="flex space-x-4">
          <li>
            <Link to="/privacy" className="hover:text-gray-300">
              {t("footer.privacy")}
            </Link>
          </li>
          <li>
            <Link to="/terms" className="hover:text-gray-300">
              {t("footer.terms")}
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
