import React from 'react';
import {
    render,
    screen,
    fireEvent,
    waitFor,
    waitForElementToBeRemoved,
    within,
} from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import '@testing-library/jest-dom';
import api from '../services/axiosInstance';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';
import { BrowserRouter } from 'react-router-dom';

global.matchMedia = global.matchMedia || function (query) {
    return {
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), 
        removeListener: jest.fn(),  
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    };
};

jest.mock('sweetalert2', () => ({
    __esModule: true,
    default: {
        fire: jest.fn(() => Promise.resolve({ isConfirmed: true })),
    },
    fire: jest.fn(() => Promise.resolve({ isConfirmed: true })),
}));

const originalConsoleError = console.error;

jest.mock('../services/axiosInstance');
jest.mock('js-cookie');
jest.mock('../components/PermissionDialog', () => () => (
    <div data-testid="permission-dialog" />
));
jest.mock('../components/ExternalCell', () => ({ cell }) => (
    <div data-testid="external-cell">{cell.value}</div>
));

const mockGrid1 = {
    id: 1,
    name: 'Test Grid',
    isPublic: true,
    columns: [
        { id: 1, name: 'TextCol', type: 'String', maxLength: 10 },
        { id: 2, name: 'NumCol', type: 'Numeric', minValue: 0, maxValue: 100 },
        { id: 3, name: 'SelectOne', type: 'SingleSelect', options: 'A,B' },
        { id: 4, name: 'SelectMulti', type: 'MultiSelect', options: 'X,Y' },
    ],
    rows: [
        {
            id: 1,
            cells: [
                { columnId: 1, value: 'text' },
                { columnId: 2, value: '42' },
                { columnId: 3, value: 'A' },
                { columnId: 4, value: 'X' },
            ],
        },
    ],
};

const mockGrid2 = {
    id: 2,
    name: 'Updated Grid',
    isPublic: false,
    columns: mockGrid1.columns,
    rows: [
        {
            id: 2,
            cells: [
                { columnId: 1, value: 'foo' },
                { columnId: 2, value: '7' },
                { columnId: 3, value: 'B' },
                { columnId: 4, value: 'Y' },
            ],
        },
    ],
};

const renderDashboard = () =>
    render(
        <BrowserRouter>
            <Dashboard />
        </BrowserRouter>
    );

beforeAll(() => {
    delete window.location;
    window.location = {
        ...window.location,
        reload: jest.fn(),
    };
});

beforeEach(() => {
    console.error = jest.fn();
    Swal.fire.mockClear();
    Swal.fire.mockImplementation(() => Promise.resolve({ isConfirmed: true }));

    Cookies.get.mockReturnValue(
        'header.' +
        btoa(
            JSON.stringify({
                unique_name: 'admin',
                'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Admin',
            })
        ) +
        '.sig'
    );
    api.get.mockResolvedValue({ data: [mockGrid1, mockGrid2] });
    api.put.mockResolvedValue({ data: { ...mockGrid1, name: 'Updated Grid' } });
    api.post.mockResolvedValue({ data: {} });
    api.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
    console.error = originalConsoleError;
});

describe('Dashboard', () => {
    test('renders and displays grids', async () => {
        renderDashboard();
        expect(await screen.findByText('Test Grid')).toBeInTheDocument();
        expect(screen.getByText('Updated Grid')).toBeInTheDocument();
    });

    test('handles error on grid fetch', async () => {
        api.get.mockRejectedValueOnce(new Error('Ошибка сети'));
        renderDashboard();
        await waitFor(() =>
            expect(screen.queryByText('Test Grid')).not.toBeInTheDocument()
        );
    });

    test('opens and closes create dialog', async () => {
        renderDashboard();
        fireEvent.click(await screen.findByText('Создать'));
        expect(screen.getByText('Создать новую таблицу')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Отмена'));
        await waitForElementToBeRemoved(() =>
            screen.queryByText('Создать новую таблицу')
        );
    });

    test('opens and closes edit dialog', async () => {
        renderDashboard();
        fireEvent.click(await screen.findByText('Редактировать'));
        const editDialog = await screen.findByRole('dialog', { name: /редактировать таблицу/i });
        expect(editDialog).toBeInTheDocument();
        fireEvent.click(screen.getByText('Отмена'));
        await waitFor(() => expect(editDialog).not.toBeVisible());
    });

    test('handles logout', async () => {
        renderDashboard();
        fireEvent.click(await screen.findByText('Выйти'));
        expect(Cookies.remove).toHaveBeenCalledWith('token');
        expect(window.location.reload).toHaveBeenCalled();
    });

    test('handles cell edit with maxLength', async () => {
        renderDashboard();
        const cell = await screen.findByText('text');
        fireEvent.doubleClick(cell);
        const input = screen.getByDisplayValue('text');
        fireEvent.change(input, { target: { value: 'toolongtextinput' } });
        fireEvent.blur(input);
        await waitFor(() => expect(api.put).toHaveBeenCalled());
    });

    test('handles numeric input with min/max', async () => {
        renderDashboard();
        const cell = await screen.findByText('42');
        fireEvent.doubleClick(cell);
        const input = screen.getByDisplayValue('42');
        fireEvent.change(input, { target: { value: '999' } });
        fireEvent.blur(input);
        await waitFor(() => expect(api.put).toHaveBeenCalled());
    });

    test('handles single select change', async () => {
        renderDashboard();
        const cell = await screen.findByText('A');
        fireEvent.doubleClick(cell);
        const optionB = await screen.findByText('B');
        fireEvent.click(optionB);
        await waitFor(() => expect(api.put).toHaveBeenCalled());
    });

    test('handles multi select toggle', async () => {
        renderDashboard();
        const optionCheckbox = await screen.findByLabelText('Y');
        fireEvent.click(optionCheckbox);
        await waitFor(() => expect(api.put).toHaveBeenCalled());
    });

    test('changes column type in create form', async () => {
        renderDashboard();
        fireEvent.click(await screen.findByText('Создать'));
        const typeSelect = screen.getByLabelText('Тип');
        fireEvent.mouseDown(typeSelect);
        fireEvent.click(await screen.findByText('Email'));
        expect(screen.getByDisplayValue('Email')).toBeInTheDocument();
    });

    test('changes column type in edit form', async () => {
        renderDashboard();
        fireEvent.click(await screen.findByText('Редактировать'));
        const editDialog = await screen.findByRole('dialog', { name: /редактировать таблицу/i });
        const typeSelects = within(editDialog).getAllByLabelText('Тип');
        fireEvent.mouseDown(typeSelects[0]);
        fireEvent.click(await screen.findByText('Регулярное выражение'));
        expect(screen.getByDisplayValue('RegExp')).toBeInTheDocument();
    });

    test('clears selection when switching grid', async () => {
        renderDashboard();
        const rowCheckbox = await screen.findByTestId('row-checkbox-1');
        const checkboxInput = within(rowCheckbox).getByRole('checkbox');
        fireEvent.click(checkboxInput);
        await waitFor(() => expect(checkboxInput).toBeChecked());
        fireEvent.click(await screen.findByText('Updated Grid'));
        const updatedCheckbox = screen.queryByTestId('row-checkbox-1');
        expect(updatedCheckbox).toBeNull();
    });

    test('handles copy/paste rows', async () => {
        renderDashboard();
        const rowCheckbox = await screen.findByTestId('row-checkbox-1');
        const checkboxInput = within(rowCheckbox).getByRole('checkbox');
        fireEvent.click(checkboxInput);
        await waitFor(() => expect(checkboxInput).toBeChecked());

        const copyButton = screen.getByTestId('copy-button');
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(screen.getByText(/Строки скопированы/i)).toBeInTheDocument();
        });

        api.post.mockResolvedValue({ data: {} });
        const pasteButton = screen.getByTestId('paste-button');
        fireEvent.click(pasteButton);

        await waitFor(() => expect(api.post).toHaveBeenCalled());
    });

    test('handles delete grid with confirm', async () => {
        Swal.fire.mockResolvedValue({ isConfirmed: true });

        renderDashboard();
        const deleteButton = await screen.findByTestId('delete-grid-button');
        fireEvent.click(deleteButton);

        await waitFor(() => expect(Swal.fire).toHaveBeenCalled());

        const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));
        await flushPromises();

        await waitFor(() => expect(api.delete).toHaveBeenCalled());
    });

    test('handles errors in create/edit/update/delete/paste', async () => {
        renderDashboard();
        api.post.mockRejectedValueOnce(new Error());
        fireEvent.click(screen.getByText('Создать'));
        fireEvent.change(screen.getByLabelText('Название таблицы'), {
            target: { value: 'Err' },
        });
        fireEvent.click(screen.getByText('Создать таблицу'));
        api.put.mockRejectedValueOnce(new Error());
        fireEvent.click(await screen.findByText('Редактировать'));
        fireEvent.click(screen.getByText('Сохранить изменения'));
        api.delete.mockRejectedValueOnce(new Error());
        window.confirm = () => true;
        const deleteButton = await screen.findByTestId('delete-grid-button');
        fireEvent.click(deleteButton);
        api.post.mockRejectedValueOnce(new Error());
        const pasteButton = screen.getByTestId('paste-button');
        fireEvent.click(pasteButton);
        await waitFor(() => expect(api.put).toHaveBeenCalled());
    });
});