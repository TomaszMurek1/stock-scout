import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../services/useAuth"; // Adjusted import path

const Header: React.FC = () => {
  const { isAuthenticated, login, logout } = useAuth();

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-gray-800">
            StockScan Pro
          </Link>
          <ul className="flex space-x-4 items-center">
            <li>
              <Link to="/" className="text-gray-600 hover:text-gray-800">
                Home
              </Link>
            </li>
            <li>
              <Link to="/about" className="text-gray-600 hover:text-gray-800">
                About
              </Link>
            </li>
            <li>
              <Link to="/contact" className="text-gray-600 hover:text-gray-800">
                Contact
              </Link>
            </li>
            <li>
              {isAuthenticated ? (
                <Button
                  variant="outline"
                  className="bg-gray-800 text-white hover:bg-gray-700"
                  onClick={logout}
                >
                  Logout
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="bg-gray-800 text-white hover:bg-gray-700"
                  onClick={login}
                >
                  Login
                </Button>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
