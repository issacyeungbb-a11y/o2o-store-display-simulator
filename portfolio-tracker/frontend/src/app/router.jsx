import { Navigate, createBrowserRouter } from "react-router-dom";

import AppShell from "../components/layout/AppShell";
import AnalysisPage from "../pages/AnalysisPage";
import AssetsPage from "../pages/AssetsPage";
import DashboardPage from "../pages/DashboardPage";
import ImportPage from "../pages/ImportPage";
import SettingsPage from "../pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "assets", element: <AssetsPage /> },
      { path: "import", element: <ImportPage /> },
      { path: "analysis", element: <AnalysisPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
