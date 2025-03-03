import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth/';  

export const login = async (username, password) => {
    try {
        const response = await fetch('https://your-api-url.com/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            throw new Error('Ошибка аутентификации');
        }

        const data = await response.json();
        return data;  
    } catch (error) {
        throw new Error('Не удалось выполнить запрос');
    }
};
