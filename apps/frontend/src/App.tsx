import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore'; // Assuming this will be created
import { useEffect } from 'react';
import LoginPage from './pages/LoginPage';

// Placeholder pages (will be created in follow-up requests – except LoginPage which is now real)
const RegisterPage = () => <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">Register Page Content</div>;
const DashboardPage = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <h1 className="text-4xl font-bold mb-4">Welcome to ADHD Tasks 🎉</h1>
    <p className="text-lg text-center max-w-md">
      Use the sidebar to navigate through your dashboard, projects, and tasks.
    </p>
  </div>
);
const ProjectsPage = () => <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">Projects Page Content</div>;
const TasksPage = () => <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">Tasks Page Content</div>;
const SettingsPage = () => <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">Settings Page Content</div>;

// Main application layout component (will be expanded later)
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar (placeholder) */}
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-md p-4 flex flex-col">
        <h2 className="text-2xl font-bold text-primary mb-6">ADHD Tasks</h2>
        <nav className="space-y-2">
          <a href="/dashboard" className="block p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Dashboard</a>
          <a href="/projects" className="block p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Projects</a>
          <a href="/tasks" className="block p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Tasks</a>
          <a href="/settings" className="block p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Settings</a>
        </nav>
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
          <button className="w-full p-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors">Logout</button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
};

function App() {
  const { user, checkAuth } = useAuthStore();

  useEffect(() => {
    // Attempt to check authentication status on app load
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            user ? (
              <MainLayout>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  {/* Redirect to dashboard if no specific path is matched within protected routes */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </MainLayout>
            ) : (
              // Redirect to login if not authenticated
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
      <Toaster position="bottom-right" reverseOrder={false} />
    </BrowserRouter>
  );
}

export default App;
