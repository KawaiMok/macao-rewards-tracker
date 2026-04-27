import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DisplayModeProvider } from './context/DisplayModeContext';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { WeekendSessionsPage } from './pages/WeekendSessionsPage';
import { WeeklyPrizeBoardPage } from './pages/WeeklyPrizeBoardPage';

const theme = createTheme({
  palette: {
    primary: { main: '#0d47a1' },
    secondary: { main: '#c62828' },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/weekend" element={<WeekendSessionsPage />} />
        <Route path="/weekly-board" element={<WeeklyPrizeBoardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <DisplayModeProvider>
            <AppRoutes />
          </DisplayModeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
