import {
  Alert,
  Box,
  Button,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '註冊失敗');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          註冊
        </Typography>
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="使用者名稱"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              fullWidth
              slotProps={{ htmlInput: { minLength: 3 } }}
              autoComplete="username"
            />
            <TextField
              label="密碼（至少 6 字）"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              slotProps={{ htmlInput: { minLength: 6 } }}
              autoComplete="new-password"
            />
            <Button type="submit" variant="contained" disabled={loading} fullWidth>
              {loading ? '建立中…' : '建立帳號'}
            </Button>
            <Typography variant="body2">
              已有帳號？{' '}
              <Link component={RouterLink} to="/login">
                登入
              </Link>
            </Typography>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
