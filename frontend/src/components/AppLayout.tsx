import { AppBar, BottomNavigation, BottomNavigationAction, Box, Button, Container, Drawer, List, ListItemButton, ListItemText, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDisplayMode } from '../context/DisplayModeContext';

const NAV_ITEMS = [
  { value: '/', label: '總覽', icon: '🏠' },
  { value: '/weekend', label: '週末抽券', icon: '🧾' },
  { value: '/weekly-board', label: '本週總覽', icon: '🎯' },
  { value: '__more__', label: '更多', icon: '⋯' },
];

export function AppLayout() {
  const { username, logout } = useAuth();
  const { mode, toggleMode } = useDisplayMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const currentTab = NAV_ITEMS.find((item) => location.pathname === item.value)?.value ?? '/';
  const mobileUiSx = mode === 'mobile'
    ? {
        // 手機模式改為白底原生風格，提升可讀性與日常使用感。
        color: '#111827',
        background: '#f7f8fa',
        '& .MuiTypography-root': {
          color: 'inherit',
        },
        '& .MuiTypography-colorTextSecondary': {
          color: 'rgba(55,65,81,0.8)',
        },
        '& .MuiCard-root': {
          borderRadius: 4,
          border: '1px solid rgba(17,24,39,0.08)',
          background: '#ffffff',
          boxShadow: '0 6px 18px rgba(17,24,39,0.08)',
        },
        '& .MuiPaper-root': {
          borderRadius: 4,
          border: '1px solid rgba(17,24,39,0.08)',
          background: '#ffffff',
        },
        '& .MuiDialog-paper': {
          borderRadius: 4,
          margin: 1.5,
          border: '1px solid rgba(17,24,39,0.12)',
          background: '#ffffff',
        },
        '& .MuiButton-root': {
          borderRadius: 999,
          textTransform: 'none',
          minHeight: 36,
          paddingLeft: 14,
          paddingRight: 14,
          fontWeight: 600,
        },
        '& .MuiButton-contained': {
          background: 'linear-gradient(180deg, #7da8ff 0%, #5e8ef6 100%)',
          color: '#ffffff',
          boxShadow: '0 8px 16px rgba(79,120,224,0.35)',
        },
        '& .MuiButton-outlined': {
          borderColor: 'rgba(79,120,224,0.4)',
          color: '#27427e',
        },
        '& .MuiButton-text': {
          color: '#27427e',
        },
        '& .MuiOutlinedInput-root': {
          borderRadius: 2.5,
          backgroundColor: '#ffffff',
          color: '#111827',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(17,24,39,0.16)',
          },
        },
        '& .MuiInputLabel-root': { color: 'rgba(17,24,39,0.72)' },
        '& .MuiSelect-icon': { color: 'rgba(17,24,39,0.72)' },
        '& .MuiTableCell-root': {
          paddingTop: 10,
          paddingBottom: 10,
          borderColor: 'rgba(17,24,39,0.1)',
          color: '#111827',
        },
        '& .MuiBottomNavigation-root': {
          background: 'rgba(255,255,255,0.96)',
          borderTop: '1px solid rgba(17,24,39,0.1)',
          backdropFilter: 'blur(8px)',
        },
        '& .MuiBottomNavigationAction-root': {
          color: 'rgba(55,65,81,0.72)',
        },
        '& .MuiBottomNavigationAction-root.Mui-selected': {
          color: '#3a63cb',
        },
        '& .MuiListItemText-primary': {
          color: '#111827',
        },
        '& .MuiListItemText-secondary': {
          color: 'rgba(55,65,81,0.72)',
        },
      }
    : {};

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: mode === 'mobile' ? '#f7f8fa' : 'grey.50', ...mobileUiSx }}>
      <AppBar
        position="static"
        color="primary"
        elevation={0}
        sx={
          mode === 'mobile'
            ? {
                color: '#111827',
                background: 'rgba(255,255,255,0.92)',
                borderBottom: '1px solid rgba(17,24,39,0.08)',
                backdropFilter: 'blur(6px)',
              }
            : undefined
        }
      >
        <Toolbar sx={{ gap: 1.25, flexWrap: mode === 'mobile' ? 'nowrap' : 'nowrap', py: mode === 'mobile' ? 0.75 : 0 }}>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              color: 'inherit',
              textDecoration: 'none',
              flexGrow: 1,
              minWidth: 0,
              fontSize: mode === 'mobile' ? 20 : undefined,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            社區消費大獎賞 2026
          </Typography>
          {mode !== 'mobile' && (
            <>
              <Button color="inherit" size="medium" component={RouterLink} to="/">
                總覽
              </Button>
              <Button color="inherit" size="medium" component={RouterLink} to="/weekend">
                以往週末抽券
              </Button>
              <Button color="inherit" size="medium" component={RouterLink} to="/weekly-board">
                本週中獎總覽
              </Button>
            </>
          )}
          {mode !== 'mobile' && (
            <>
              <Button color="inherit" size="medium" variant="outlined" onClick={toggleMode} sx={{ borderColor: 'rgba(255,255,255,0.5)' }}>
                切換手機版
              </Button>
              <Typography variant="body2" sx={{ opacity: 0.9, ml: 0.5 }}>
                {username}
              </Typography>
              <Button color="inherit" size="medium" onClick={logout}>
                登出
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth={mode === 'mobile' ? 'sm' : 'lg'} sx={{ py: mode === 'mobile' ? 2 : 3, pb: mode === 'mobile' ? 10 : 3 }}>
        <Outlet />
      </Container>
      {mode === 'mobile' && (
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1200,
            borderTop: mode === 'mobile' ? '1px solid rgba(17,24,39,0.1)' : '1px solid',
            borderColor: mode === 'mobile' ? undefined : 'divider',
            bgcolor: mode === 'mobile' ? 'rgba(255,255,255,0.96)' : 'background.paper',
            pb: 'env(safe-area-inset-bottom)',
            backdropFilter: mode === 'mobile' ? 'blur(8px)' : undefined,
          }}
        >
          <BottomNavigation
            showLabels
            value={currentTab}
            onChange={(_, value) => {
              if (value === '__more__') {
                setMoreOpen(true);
                return;
              }
              navigate(value);
            }}
          >
            {NAV_ITEMS.map((item) => (
              <BottomNavigationAction key={item.value} value={item.value} label={item.label} icon={<span aria-hidden>{item.icon}</span>} />
            ))}
          </BottomNavigation>
        </Box>
      )}
      <Drawer
        anchor="bottom"
        open={mode === 'mobile' && moreOpen}
        onClose={() => setMoreOpen(false)}
        sx={
          mode === 'mobile'
            ? {
                '& .MuiDrawer-paper': {
                  borderTopLeftRadius: 18,
                  borderTopRightRadius: 18,
                  pb: 'env(safe-area-inset-bottom)',
                  borderTop: '1px solid rgba(17,24,39,0.12)',
                  background: '#ffffff',
                },
              }
            : undefined
        }
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            👤 {username}
          </Typography>
        </Box>
        <List sx={{ pt: 0 }}>
          <ListItemButton
            onClick={() => {
              setMoreOpen(false);
              toggleMode();
            }}
          >
            <ListItemText primary="🔄 切回桌面版" />
          </ListItemButton>
          <ListItemButton
            onClick={() => {
              setMoreOpen(false);
              logout();
            }}
          >
            <ListItemText primary="🚪 登出" />
          </ListItemButton>
        </List>
      </Drawer>
    </Box>
  );
}
