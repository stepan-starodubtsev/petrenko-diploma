// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../stores';
import { useNavigate, Navigate } from 'react-router-dom';

import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

const LoginPage = observer(() => {
    const { authStore } = useStores();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState(''); // Локальна помилка для валідації форми

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLocalError(''); // Скидаємо попередні локальні помилки

        if (!username || !password) {
            setLocalError("Будь ласка, введіть ім'я користувача та пароль.");
            return;
        }

        const success = await authStore.login(username, password);
        if (success) {
            navigate('/dashboard', { replace: true }); // Перенаправлення на дашборд
        }
        // authStore.error буде встановлено у разі невдалого логіну
    };

    // Якщо користувач вже аутентифікований, перенаправляємо на дашборд
    if (authStore.isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <Grid container component="main" sx={{ height: '100vh' }}>
            <Grid
                item
                xs={false}
                sm={4}
                md={7}
                sx={{
                    backgroundImage: 'url(https://source.unsplash.com/random?wallpapers)', // Випадкове фонове зображення
                    backgroundRepeat: 'no-repeat',
                    backgroundColor: (t) =>
                        t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            <Grid item size={12} component={Paper} elevation={6} square>
                <Box
                    sx={{
                        my: 8,
                        mx: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                        <LockOutlinedIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Вхід в Систему
                    </Typography>
                    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1 }}>
                        {(authStore.error || localError) && (
                            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                                {localError || authStore.error}
                            </Alert>
                        )}
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Ім'я користувача"
                            name="username"
                            autoComplete="username"
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Пароль"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {/* <FormControlLabel
                            control={<Checkbox value="remember" color="primary" />}
                            label="Запам'ятати мене"
                        /> */}
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2, py: 1.5 }}
                            disabled={authStore.isLoading}
                        >
                            {authStore.isLoading ? <CircularProgress size={24} color="inherit"/> : "Увійти"}
                        </Button>
                        {/* // Пізніше можна додати посилання на реєстрацію або відновлення паролю
                        <Grid container>
                            <Grid item xs>
                                <Link href="#" variant="body2">
                                    Забули пароль?
                                </Link>
                            </Grid>
                            <Grid item>
                                <Link href="#" variant="body2">
                                    {"Немає акаунту? Зареєструватися"}
                                </Link>
                            </Grid>
                        </Grid>
                        */}
                    </Box>
                </Box>
            </Grid>
        </Grid>
    );
});

export default LoginPage;