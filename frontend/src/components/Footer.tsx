import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <p>&copy; 2023 StockScan Pro</p>
        <ul className="flex space-x-4">
          <li>
            <Link to="/privacy" className="hover:text-gray-300">
              Privacy
            </Link>
          </li>
          <li>
            <Link to="/terms" className="hover:text-gray-300">
              Terms
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
