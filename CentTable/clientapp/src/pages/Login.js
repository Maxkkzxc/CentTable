import React, { useState } from 'react';
import { TextField, Button, Grid, Typography, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import Cookies from 'js-cookie';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await login(username, password);
            if (response.token) {
                Cookies.set('token', response.token, { expires: 7, secure: true, sameSite: 'Strict' });
                navigate('/dashboard');
            }
        } catch (err) {
            setError('Неверный логин или пароль');
            console.error(err.response ? err.response.data : err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Grid container justifyContent="center" alignItems="center" style={{ height: '100vh' }}>
            <form onSubmit={handleLogin} style={{ width: '300px' }}>
                <Typography variant="h4" align="center" gutterBottom>
                    Вход
                </Typography>
                <TextField
                    label="Логин"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <TextField
                    label="Пароль"
                    type="password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                {error && <Typography color="error">{error}</Typography>}
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={loading}
                    sx={{
                        backgroundColor: loading ? 'rgba(255, 255, 255, 0.3)' : '#424242', 
                        color: loading ? 'rgba(255, 255, 255, 0.7)' : '#ffffff', 
                        '&:hover': {
                            backgroundColor: loading ? 'rgba(255, 255, 255, 0.3)' : '#616161', 
                        },
                    }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Войти'}
                </Button>
                <Button
                    fullWidth
                    color="secondary"
                    onClick={() => navigate('/register')}
                    style={{ marginTop: '10px' }}
                >
                    Нет аккаунта? Зарегистрироваться
                </Button>
            </form>
        </Grid>
    );
}

export default Login;
