import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import Cookies from 'js-cookie';

jest.mock('js-cookie');

describe('App', () => {
    test('if the token is missing, the login page is displayed', () => {
        Cookies.get.mockReturnValue(undefined);

        render(<App />);

        expect(
            screen.getByText((content) => content.includes("Вход"))
        ).toBeInTheDocument();
    });
});
