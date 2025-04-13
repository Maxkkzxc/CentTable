import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PermissionDialog from './PermissionDialog';
import api from '../services/axiosInstance';

jest.mock('../services/axiosInstance');

describe('PermissionDialog', () => {
    const dataGridId = "1";
    const mockOnClose = jest.fn();
    const mockOnPermissionsUpdated = jest.fn();

    const gridResponse = {
        data: {
            permissions: [
                { UserId: "user1", CanView: true, CanEdit: false, CanDelete: false }
            ]
        }
    };

    const usersResponse = {
        data: [
            { id: "user1", username: "Test User" },
            { id: "user2", username: "Another User" }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
        api.get.mockImplementation((url) => {
            if (url.startsWith(`datagrid/${dataGridId}`)) {
                return Promise.resolve(gridResponse);
            }
            if (url.startsWith('users')) {
                return Promise.resolve(usersResponse);
            }
            return Promise.reject(new Error('Unknown URL'));
        });
        api.put.mockResolvedValue({});
    });

    test('downloads and displays users and their rights', async () => {
        render(
            <PermissionDialog
                open={true}
                onClose={mockOnClose}
                dataGridId={dataGridId}
                onPermissionsUpdated={mockOnPermissionsUpdated}
            />
        );

        expect(await screen.findByText(/Test User/i)).toBeInTheDocument();
        expect(await screen.findByText(/Another User/i)).toBeInTheDocument();

        const checkboxes = screen.getAllByLabelText(/Просмотр/i);
        expect(checkboxes[0].checked).toBe(true);
    });

    test('changes rights and causes saving', async () => {
        render(
            <PermissionDialog
                open={true}
                onClose={mockOnClose}
                dataGridId={dataGridId}
                onPermissionsUpdated={mockOnPermissionsUpdated}
            />
        );

        expect(await screen.findByText(/Test User/i)).toBeInTheDocument();

        const checkboxes = screen.getAllByLabelText(/Просмотр/i);
        const anotherUserCheckbox = checkboxes[1];
        expect(anotherUserCheckbox.checked).toBe(false);

        fireEvent.click(anotherUserCheckbox);
        expect(anotherUserCheckbox.checked).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: /Сохранить/i }));

        await waitFor(() => {
            expect(api.put).toHaveBeenCalledTimes(1);
        });
        expect(mockOnPermissionsUpdated).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
    });
});
