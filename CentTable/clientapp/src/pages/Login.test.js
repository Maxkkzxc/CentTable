import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './Login';
import { login } from '../services/authService';
import { BrowserRouter } from 'react-router-dom';
import Cookies from 'js-cookie';

jest.mock('../services/authService', () => ({
    login: jest.fn(),
}));

const mockedUsedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockedUsedNavigate,
}));

describe('Страница Login', () => {
    let cookiesSetSpy;
    let consoleErrorSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        cookiesSetSpy = jest.spyOn(Cookies, 'set');
    });

    afterEach(() => {
        cookiesSetSpy.mockRestore();
        if (consoleErrorSpy) {
            consoleErrorSpy.mockRestore();
        }
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );
    };

    test('renders the login form with fields and buttons', () => {
        renderComponent();

        expect(screen.getByLabelText(/Логин/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Пароль/i)).toBeInTheDocument();
        expect(screen.getByTestId('login-submit')).toBeInTheDocument();
        expect(screen.getByText(/Нет аккаунта\? Зарегистрироваться/i)).toBeInTheDocument();
    });

    test('updates input values when changing', () => {
        renderComponent();

        const usernameInput = screen.getByLabelText(/Логин/i);
        const passwordInput = screen.getByLabelText(/Пароль/i);

        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

        expect(usernameInput.value).toBe('testuser');
        expect(passwordInput.value).toBe('testpassword');
    });

    test('successful login triggers navigate on /dashboard', async () => {
        login.mockResolvedValue({ token: 'dummy-token' });

        renderComponent();

        const usernameInput = screen.getByLabelText(/Логин/i);
        const passwordInput = screen.getByLabelText(/Пароль/i);
        const submitButton = screen.getByTestId('login-submit');

        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
        fireEvent.click(submitButton);

        expect(submitButton).toBeDisabled();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();

        await waitFor(() => {
            expect(login).toHaveBeenCalledWith('testuser', 'testpassword');
        });

        await waitFor(() => {
            expect(cookiesSetSpy).toHaveBeenCalledWith('token', 'dummy-token', {
                expires: 7,
                secure: true,
                sameSite: 'Strict',
            });
        });

        await waitFor(() => {
            expect(mockedUsedNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });

    test('if the login is incorrect, an error message is displayed', async () => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        login.mockRejectedValue(new Error('Login failed'));

        renderComponent();

        const usernameInput = screen.getByLabelText(/Логин/i);
        const passwordInput = screen.getByLabelText(/Пароль/i);
        const submitButton = screen.getByTestId('login-submit');

        fireEvent.change(usernameInput, { target: { value: 'wronguser' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(login).toHaveBeenCalledWith('wronguser', 'wrongpassword');
        });

        await waitFor(() => {
            expect(screen.getByText(/Неверный логин или пароль/i)).toBeInTheDocument();
        });

        expect(mockedUsedNavigate).not.toHaveBeenCalled();
    });

    test('when you click on the registration button, navigate to /register is called', () => {
        renderComponent();

        const registerButton = screen.getByText(/Нет аккаунта\? Зарегистрироваться/i);
        fireEvent.click(registerButton);
        expect(mockedUsedNavigate).toHaveBeenCalledWith('/register');
    });
});
