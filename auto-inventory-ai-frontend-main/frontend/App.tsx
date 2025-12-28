
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { LanguageProvider } from './context/LanguageContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Sales } from './components/Sales';
import { Analytics } from './components/Analytics';
import { GSTReport } from './components/GSTReport';
import { Customers } from './components/Customers';
import { Suppliers } from './components/Suppliers';
import { Settings } from './components/Settings';
import { Login } from './components/Login';
import { UsersComp } from './components/Users';
import { Trash } from './components/Trash';
import { ExcelImport } from './components/ExcelImport';
import { TenantSetup } from './components/TenantSetup';

// Inner component that uses the context
const AppRoutes: React.FC = () => {
  const { token, loginUser } = useApp();

  if (!token) {
    return <Login onLogin={loginUser} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="inventory/import" element={<ExcelImport />} />
        <Route path="sales" element={<Sales />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="gst-report" element={<GSTReport />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="users" element={<UsersComp />} />
        <Route path="trash" element={<Trash />} />
        <Route path="settings" element={<Settings />} />
        <Route path="setup-warehouse" element={<TenantSetup />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <LanguageProvider>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </LanguageProvider>
  );
}

export default App;
