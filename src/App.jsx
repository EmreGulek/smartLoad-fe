import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import HomePage from './pages/HomePage';
import CargoImporterPage from './pages/CargoImporterPage';
import LoginPage from './pages/LoginPage';
import ManifestListPage from './pages/ManifestListPage';
import ManifestDetailPage from './pages/ManifestDetailPage';
import ViewerPage from './pages/ViewerPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/cargo-importer" element={<CargoImporterPage />} />
          <Route path="/manifests" element={<ManifestListPage />} />
          <Route path="/manifests/:id" element={<ManifestDetailPage />} />
          <Route path="/viewer" element={<ViewerPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
