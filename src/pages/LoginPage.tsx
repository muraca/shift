import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CssBaseline,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/disponibilita', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const success = await login(password);
    if (success) {
      setOpenDialog(false);
      navigate('/disponibilita', { replace: true });
    } else {
      setError('Password errata. Riprova.');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        padding: 2,
      }}
    >
      <CssBaseline />

      <Dialog
        open={openDialog}
        onClose={(_event, reason) => {
          if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
            setOpenDialog(false);
          }
        }}
        disableEscapeKeyDown
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center' }}>Accedi</DialogTitle>
        <DialogContent dividers>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(e);
                }
              }}
            />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button
            type="submit"
            variant="contained"
            sx={{ mt: 1, mb: 1 }}
            onClick={handleSubmit}
          >
            Accedi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoginPage;