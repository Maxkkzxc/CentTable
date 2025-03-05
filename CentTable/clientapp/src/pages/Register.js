import React, { useState } from 'react';
import { TextField, Button, Grid, Typography } from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/account/register', {
                username,
                email,
                firstName,
                lastName,
                dateOfBirth,
                password,
                confirmPassword 
            });
            localStorage.setItem('token', response.data.token);
            navigate('/dashboard');
        } catch (err) {
            setError('Ошибка регистрации');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Grid container justifyContent="center" alignItems="center" style={{ height: '100vh' }}>
            <form onSubmit={handleRegister} style={{ width: '300px' }}>
                <Typography variant="h4" align="center" gutterBottom>
                    Регистрация
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
                    label="Email"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                    label="Имя"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                />
                <TextField
                    label="Фамилия"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                />
                <TextField
                    label="Дата рождения"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    type="date"
                    InputLabelProps={{
                        shrink: true,
                    }}
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
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
                <TextField
                    label="Повторите пароль"
                    type="password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {error && <Typography color="error">{error}</Typography>}
                <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading}>
                    {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </Button>
                <Button
                    fullWidth
                    color="secondary"
                    onClick={() => navigate('/login')}
                    style={{ marginTop: '10px' }}
                >
                    Уже есть аккаунт? Войти
                </Button>
            </form>
        </Grid>
    );
}

export default Register;
