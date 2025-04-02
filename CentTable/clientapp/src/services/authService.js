import api from './axiosInstance';
import Cookies from 'js-cookie';

export const register = async (userData) => {
    const response = await api.post('account/register', userData);
    Cookies.set('token', response.data.token, { expires: 90, secure: true, sameSite: 'Strict' });
    return response.data;
};

export const login = async (username, password) => {
    const response = await api.post('account/login', { username, password });
    Cookies.set('token', response.data.token, { expires: 90, secure: true, sameSite: 'Strict' });
    return response.data;
};

export const logout = () => {
    Cookies.remove('token');
};
