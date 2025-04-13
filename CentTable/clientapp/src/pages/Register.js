import React, { useState } from 'react';
import {
    TextField,
    Button,
    Grid,
    Typography,
    CircularProgress,
    Box,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import api from '../services/axiosInstance';
import Cookies from 'js-cookie';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const CustomTextField = styled(TextField)(({ theme }) => ({
    '& .MuiOutlinedInput-root': {
        height: '56px',
        minHeight: '56px',
        '& input': {
            padding: '18.5px 14px',
        },
    },
    marginBottom: theme.spacing(2),
}));

const StyledDatePicker = styled(DatePicker)(({ theme }) => ({
    '& .MuiOutlinedInput-root': {
        height: '56px !important',
        minHeight: '56px !important',
        '& input': {
            padding: '18.5px 14px !important',
            height: '56px !important',
        },
    },
    marginBottom: theme.spacing(2),
    width: '100%',
}));

const passwordCriteria = [
    { label: 'Не менее 8 символов', test: (password) => password.length >= 8 },
    { label: 'Наличие строчных букв', test: (password) => /[a-z]/.test(password) },
    { label: 'Наличие прописных букв', test: (password) => /[A-Z]/.test(password) },
    { label: 'Наличие цифры', test: (password) => /[0-9]/.test(password) },
    { label: 'Наличие спецсимвола', test: (password) => /[^A-Za-z0-9]/.test(password) },
];

function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState(null);
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
            const formattedDate = dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : '';
            const response = await api.post('account/register', {
                username,
                email,
                firstName,
                lastName,
                dateOfBirth: formattedDate,
                password,
                confirmPassword,
            });
            Cookies.set('token', response.data.token, { expires: 7, secure: true, sameSite: 'Strict' });
            navigate('/dashboard');
        } catch (err) {
            setError('Ошибка регистрации');
            console.error(err.response ? err.response.data : err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Grid container justifyContent="center" alignItems="center" style={{ height: '100vh' }}>
            <form onSubmit={handleRegister} style={{ width: '300px', position: 'relative' }}>
                <Typography variant="h4" align="center" gutterBottom>
                    Регистрация
                </Typography>
                <CustomTextField
                    label="Логин"
                    variant="outlined"
                    fullWidth
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <CustomTextField
                    label="Email"
                    variant="outlined"
                    fullWidth
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <CustomTextField
                    label="Имя"
                    variant="outlined"
                    fullWidth
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                />
                <CustomTextField
                    label="Фамилия"
                    variant="outlined"
                    fullWidth
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                />

                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <StyledDatePicker
                        label="Дата рождения"
                        value={dateOfBirth}
                        onChange={(newValue) => setDateOfBirth(newValue)}
                        renderInput={(params) => (
                            <CustomTextField
                                {...params}
                                variant="outlined"
                                fullWidth
                                InputLabelProps={{
                                    ...params.InputLabelProps,
                                    shrink: true,
                                }}
                            />
                        )}
                    />
                </LocalizationProvider>

                <Box position="relative">
                    <CustomTextField
                        label="Пароль"
                        type="password"
                        variant="outlined"
                        fullWidth
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {password && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 'calc(100% + 8px)',
                                width: '200px',
                                background: '#1d1d1d',         
                                border: '1px solid #424242',    
                                padding: '8px',
                                borderRadius: '4px',
                                boxShadow: '0px 0px 5px rgba(0,0,0,0.5)',
                            }}
                        >
                            {passwordCriteria.map((criterion, index) => {
                                const isValid = criterion.test(password);
                                return (
                                    <Box key={index} display="flex" alignItems="center" mb={0.5}>
                                        {isValid ? (
                                            <CheckCircleIcon fontSize="small" style={{ color: '#388e3c', marginRight: 4 }} />
                                        ) : (
                                            <CancelIcon fontSize="small" style={{ color: '#d32f2f', marginRight: 4 }} />
                                        )}
                                        <Typography variant="body2" style={{ color: isValid ? '#388e3c' : '#d32f2f' }}>
                                            {criterion.label}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}
                </Box>

                <CustomTextField
                    label="Повторите пароль"
                    type="password"
                    variant="outlined"
                    fullWidth
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />

                {error && <Typography color="error">{error}</Typography>}
                <Button
                    type="submit"
                    data-testid="register-submit"
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
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Зарегистрироваться'}
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