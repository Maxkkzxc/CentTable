import api from './axiosInstance';

export const register = async (userData) => {
    const response = await api.post('account/register', userData);
    localStorage.setItem('token', response.data.token);
    return response.data;
};

export const login = async (username, password) => {
    const response = await api.post('account/login', { username, password });
    localStorage.setItem('token', response.data.token);
    return response.data;
};

export const logout = () => {
    localStorage.removeItem('token');
};
