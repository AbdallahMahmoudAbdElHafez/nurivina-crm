// components/ManagerOrAdminRoute.jsx
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function ManagerOrAdminRoute({ children }) {
  const { user } = useSelector((s) => s.auth);
  if (!user || (user.role !== "admin" && user.role !== "manager"))
    return <Navigate to="/home" />;
  return children;
}
