import React, { useState } from 'react';
import { TextField, Button, Grid, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';  
import { login } from '../services/authService';

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
                navigate('/dashboard');  
            }
        } catch (err) {
            setError('Неверный логин или пароль');
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
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    margin="normal"
                />
                <TextField
                    label="Пароль"
                    type="password"
                    variant="outlined"
                    fullWidth
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    margin="normal"
                />
                {error && <Typography color="error">{error}</Typography>}
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={loading}  
                >
                    {loading ? 'Загрузка...' : 'Войти'}
                </Button>
            </form>
        </Grid>
    );
}

export default Login;
