import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../services/useAuth"; // Adjusted import path

interface PrivateRouteProps {
  element: React.ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ element }) => {
  const { isAuthenticated } = useAuth();
  console.log(isAuthenticated);

  return isAuthenticated ? element : <Navigate to="/signin" replace />;
};

export default PrivateRoute;
