import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Header } from "@/components/Header";
import { ClinicDetailPage } from "@/pages/ClinicDetailPage";
import { ClinicListPage } from "@/pages/ClinicListPage";

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />
      <Outlet />
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ClinicListPage />} />
        <Route path="/clinica/:id" element={<ClinicDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
