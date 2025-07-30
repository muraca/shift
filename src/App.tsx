import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import AvailabilityPage from './pages/AvailabilityPage';
import TurniPage from './pages/ShiftsPage';
import theme from './styles/theme'; 

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AuthGuard />}>
              <Route element={<Layout />}>
                <Route path="/avail" element={<AvailabilityPage />} />
                <Route path="/shift" element={<TurniPage />} />
                <Route path="/" element={<Navigate to="/avail" replace />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/avail" replace />} /> 
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;