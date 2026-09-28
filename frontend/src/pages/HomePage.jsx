import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);




  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">لوحة التحكم الرئيسية</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {user.full_name}
      </div>
    </div>
  );
}
