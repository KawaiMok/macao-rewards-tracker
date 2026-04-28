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
import { GoogleLogin } from '@react-oauth/google';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登入失敗');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          登入
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
              autoComplete="username"
            />
            <TextField
              label="密碼"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="current-password"
            />
            <Button type="submit" variant="contained" disabled={loading} fullWidth>
              {loading ? '登入中…' : '登入'}
            </Button>

            {/* 臨時偵錯：固定顯示目前前端讀到的 Google Client ID 狀態 */}
          

              <>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <GoogleLogin
                    useOneTap={false}
                    width="320"
                    onSuccess={async (cred) => {
                      if (!cred.credential) {
                        setError('Google 登入失敗（未取得 credential）');
                        return;
                      }
                      setError(null);
                      setGoogleLoading(true);
                      try {
                        await loginWithGoogle(cred.credential);
                        navigate('/');
                      } catch (err) {
                        setError(err instanceof ApiError ? err.message : 'Google 登入失敗');
                      } finally {
                        setGoogleLoading(false);
                      }
                    }}
                    onError={() => setError('Google 登入失敗')}
                  />
                </Box>
                {googleLoading && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    正在完成 Google 登入…
                  </Typography>
                )}
              </>
            
            
            

            <Typography variant="body2">
              還沒有帳號？{' '}
              <Link component={RouterLink} to="/register">
                註冊
              </Link>
            </Typography>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
