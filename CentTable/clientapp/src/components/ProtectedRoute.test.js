import React from 'react';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from './ProtectedRoute';
import Cookies from 'js-cookie';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

jest.mock('js-cookie');

describe('ProtectedRoute', () => {
    const DummyComponent = () => <div>Protected Content</div>;

    test('displays the child component if the token exists', () => {
        Cookies.get.mockReturnValue('valid-token');

        render(
            <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                    <Route
                        path="/protected"
                        element={
                            <ProtectedRoute>
                                <DummyComponent />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Protected Content/i)).toBeInTheDocument();
    });

    test('redirects to /login if the token is missing', () => {
        Cookies.get.mockReturnValue(undefined);

        render(
            <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                    <Route
                        path="/protected"
                        element={
                            <ProtectedRoute>
                                <DummyComponent />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/login" element={<div>Login Page</div>} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
    });
});
