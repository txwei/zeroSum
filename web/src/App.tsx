import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GroupProvider } from './context/GroupContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import PublicGameEntry from './pages/PublicGameEntry';
import Layout from './components/Layout';
import { getBasePath } from './utils/env';
import { ErrorBoundary } from './components/ErrorBoundary';

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/games/public/:token" element={<PublicGameEntry />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Groups />} />
        <Route path="groups" element={<Groups />} />
        <Route path="groups/:groupId" element={<GroupDetails />} />
      </Route>
    </Routes>
  );
};

function App() {
  // Get base path from Vite's base config (for GitHub Pages)
  // In production, this will be '/zeroSum/' or '/' depending on deployment
  const basePath = getBasePath();
  
  return (
    <ErrorBoundary>
      <Router basename={basePath}>
        <AuthProvider>
          <GroupProvider>
            <AppRoutes />
          </GroupProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

