import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Wallets from './pages/Wallets';
import Tags from './pages/Tags';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import Recurring from './pages/Recurring';
import { RecurringService } from './features/recurring';

import { AuthProvider, PreferencesProvider } from './context';

if (import.meta.env.DEV) {
  import('./utils/devTools');
}

function App() {
  // Automatically scan and generate due recurring transactions on app boot
  useEffect(() => {
    RecurringService.generateDueTransactions().catch((err) => {
      console.error('Failed to run recurring transaction generator:', err);
    });
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="jedana-theme">
      <AuthProvider>
        <PreferencesProvider>
          <BrowserRouter>
            <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
              <Sidebar />
              
              {/* Main Content */}
              <main className="flex-1 px-4 py-4 sm:px-6 md:p-8 lg:p-10 pb-28 md:pb-10 overflow-x-hidden">
                <div className="max-w-5xl mx-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/wallets" element={<Wallets />} />
                    <Route path="/recurring" element={<Recurring />} />
                    <Route path="/tags" element={<Tags />} />
                    <Route path="/statistics" element={<Statistics />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </div>
              </main>
            </div>
          </BrowserRouter>
        </PreferencesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
