import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../services/Auth.hooks";

interface PrivateRouteProps {
  element: React.ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ element }) => {
  const { isAuthenticated } = useAuth();
  console.log("PrivateRoute - isAuthenticated:", isAuthenticated);

  return isAuthenticated ? element : <Navigate to="/signin" replace />;
};

export default PrivateRoute;
