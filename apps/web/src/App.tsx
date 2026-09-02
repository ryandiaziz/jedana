import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Wallets from './pages/Wallets';
import Tags from './pages/Tags';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';

import { AuthProvider } from './context';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="jedana-theme">
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
            <Sidebar />
            
            {/* Main Content */}
            <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
              <div className="max-w-4xl mx-auto">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/wallets" element={<Wallets />} />
                  <Route path="/tags" element={<Tags />} />
                  <Route path="/statistics" element={<Statistics />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
