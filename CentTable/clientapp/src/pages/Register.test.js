import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Register from './Register';
import api from '../services/axiosInstance';
import Cookies from 'js-cookie';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../services/axiosInstance');
jest.mock('js-cookie');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

jest.mock('@mui/x-date-pickers/DatePicker', () => ({
    DatePicker: ({ label, value, onChange, renderInput, ...props }) => {
        return renderInput({
            label,
            value: value || '',
            onChange: (e) => onChange(new Date(e.target.value)),
            inputProps: { 'data-testid': 'date-picker-input' },
            ...props,
        });
    },
}));

describe('Register Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('an error is displayed when passwords do not match', async () => {
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText(/Логин/i), { target: { value: 'newuser' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } });
        fireEvent.change(screen.getByLabelText(/Имя/i), { target: { value: 'Имя' } });
        fireEvent.change(screen.getByLabelText(/Фамилия/i), { target: { value: 'Фамилия' } });
        fireEvent.change(screen.getByLabelText(/^Пароль$/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/Повторите пароль/i), { target: { value: 'differentPassword' } });

        const submitButton = await screen.findByTestId('register-submit');
        fireEvent.click(submitButton);

        const errorMessage = await screen.findByText(/Пароли не совпадают/i);
        expect(errorMessage).toBeInTheDocument();
        expect(api.post).not.toHaveBeenCalled();
    });

    test('successful registration without date of birth', async () => {
        api.post.mockResolvedValueOnce({ data: { token: 'fakeToken' } });

        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText(/Логин/i), { target: { value: 'newuser' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } });
        fireEvent.change(screen.getByLabelText(/Имя/i), { target: { value: 'Имя' } });
        fireEvent.change(screen.getByLabelText(/Фамилия/i), { target: { value: 'Фамилия' } });
        fireEvent.change(screen.getByLabelText(/^Пароль$/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/Повторите пароль/i), { target: { value: 'password123' } });

        const submitButton = await screen.findByTestId('register-submit');
        fireEvent.click(submitButton);

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                'account/register',
                expect.objectContaining({
                    username: 'newuser',
                    email: 'user@example.com',
                    firstName: 'Имя',
                    lastName: 'Фамилия',
                    dateOfBirth: '',
                    password: 'password123',
                    confirmPassword: 'password123',
                })
            )
        );

        expect(Cookies.set).toHaveBeenCalledWith('token', 'fakeToken', {
            expires: 7,
            secure: true,
            sameSite: 'Strict',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    test('successful registration with date of birth', async () => {
        api.post.mockResolvedValueOnce({ data: { token: 'fakeToken' } });

        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText(/Логин/i), { target: { value: 'newuser' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } });
        fireEvent.change(screen.getByLabelText(/Имя/i), { target: { value: 'Имя' } });
        fireEvent.change(screen.getByLabelText(/Фамилия/i), { target: { value: 'Фамилия' } });

        const dateInput = await screen.findByTestId('date-picker-input');
        fireEvent.change(dateInput, { target: { value: '2020-01-01' } });

        fireEvent.change(screen.getByLabelText(/^Пароль$/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/Повторите пароль/i), { target: { value: 'password123' } });

        const submitButton = await screen.findByTestId('register-submit');
        fireEvent.click(submitButton);

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                'account/register',
                expect.objectContaining({
                    username: 'newuser',
                    email: 'user@example.com',
                    firstName: 'Имя',
                    lastName: 'Фамилия',
                    dateOfBirth: '2020-01-01',
                    password: 'password123',
                    confirmPassword: 'password123',
                })
            )
        );

        expect(Cookies.set).toHaveBeenCalledWith('token', 'fakeToken', {
            expires: 7,
            secure: true,
            sameSite: 'Strict',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    test('registration error during API failure', async () => {
        api.post.mockRejectedValueOnce(new Error('Registration failed'));

        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText(/Логин/i), { target: { value: 'newuser' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } });
        fireEvent.change(screen.getByLabelText(/Имя/i), { target: { value: 'Имя' } });
        fireEvent.change(screen.getByLabelText(/Фамилия/i), { target: { value: 'Фамилия' } });
        fireEvent.change(screen.getByLabelText(/^Пароль$/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/Повторите пароль/i), { target: { value: 'password123' } });

        const submitButton = await screen.findByTestId('register-submit');
        fireEvent.click(submitButton);

        const errorMessage = await screen.findByText(/Ошибка регистрации/i);
        expect(errorMessage).toBeInTheDocument();
        expect(Cookies.set).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('the registration button is blocked during the download', async () => {
        const pendingPromise = new Promise(() => { });
        api.post.mockReturnValueOnce(pendingPromise);

        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText(/Логин/i), { target: { value: 'loadinguser' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'loading@example.com' } });
        fireEvent.change(screen.getByLabelText(/Имя/i), { target: { value: 'Имя' } });
        fireEvent.change(screen.getByLabelText(/Фамилия/i), { target: { value: 'Фамилия' } });
        fireEvent.change(screen.getByLabelText(/^Пароль$/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/Повторите пароль/i), { target: { value: 'password123' } });

        const submitButton = await screen.findByTestId('register-submit');
        fireEvent.click(submitButton);

        await waitFor(() => expect(submitButton).toBeDisabled());
        await screen.findByRole('progressbar');
    });

    test('you go to the login page when you click on the button "Do you already have an account? Enter"', () => {
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        );

        const loginButton = screen.getByRole('button', { name: /Уже есть аккаунт\? Войти/i });
        fireEvent.click(loginButton);
        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
});