import React from 'react';
import {
    render,
    screen,
    waitFor,
    cleanup,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import ExternalCell from './ExternalCell';
import api from '../services/axiosInstance';

jest.mock('../services/axiosInstance', () => ({
    get: jest.fn(),
}));

jest.mock('./SelectRecordDialog', () => {
    return function DummySelectRecordDialog(props) {
        return (
            <div data-testid="select-record-dialog">
                {props.open && (
                    <>
                        <button
                            data-testid="select-self"
                            onClick={() =>
                                props.onSelect({
                                    gridId: props.currentGridId,
                                    rowId: props.currentRowId,
                                    targetColumnId: props.columnId || 999,
                                })
                            }
                        >
                            Select Self
                        </button>
                        <button
                            data-testid="select-different"
                            onClick={() =>
                                props.onSelect({
                                    gridId: props.currentGridId + 1,
                                    rowId: props.currentRowId + 1,
                                    targetColumnId: props.columnId || 999,
                                })
                            }
                        >
                            Select Different
                        </button>
                        <button data-testid="close-dialog" onClick={props.onClose}>
                            Close
                        </button>
                    </>
                )}
            </div>
        );
    };
});

jest.setTimeout(15000);

const defaultProps = {
    onUpdate: jest.fn(),
    currentGridId: 1,
    currentRowId: 2,
    canEdit: true,
};

const validCellValue = JSON.stringify({
    gridId: 1,
    rowId: 2,
    targetColumnId: 3,
});

describe('ExternalCell - Data Loading', () => {
    beforeEach(() => {
        jest.useFakeTimers('modern');
    });
    afterEach(() => {
        cleanup();
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    test('with valid JSON and initial loading, "Loading..." is displayed and then the value', async () => {
        api.get.mockResolvedValue({
            data: {
                rows: [{ id: 2, cells: [{ columnId: 3, value: 'Test Value' }] }],
            },
        });
        render(<ExternalCell cell={{ value: validCellValue }} {...defaultProps} />);
        expect(screen.getByText(/Загрузка/i)).toBeInTheDocument();
        jest.advanceTimersByTime(2100);
        await Promise.resolve();
        await screen.findByText('Test Value');
    });

    test('if the string is not found, the error "String not found" is displayed', async () => {
        api.get.mockResolvedValue({ data: { rows: [] } });
        render(<ExternalCell cell={{ value: validCellValue }} {...defaultProps} />);
        jest.advanceTimersByTime(2100);
        await Promise.resolve();
        await screen.findByText(/Строка не найдена/i);
    });

    test('if a targetCell is found, its value is displayed.', async () => {
        api.get.mockResolvedValue({
            data: {
                rows: [{ id: 2, cells: [{ columnId: 3, value: 'Found Value' }] }],
            },
        });
        render(<ExternalCell cell={{ value: validCellValue }} {...defaultProps} />);
        jest.advanceTimersByTime(2100);
        await Promise.resolve();
        await screen.findByText('Found Value');
    });

    test('if the targetCell is missing, "No value" is displayed', async () => {
        api.get.mockResolvedValue({
            data: {
                rows: [{ id: 2, cells: [{ columnId: 99, value: 'Some Value' }] }],
            },
        });
        render(<ExternalCell cell={{ value: validCellValue }} {...defaultProps} />);
        jest.advanceTimersByTime(2100);
        await Promise.resolve();
        await screen.findByText(/Нет значения/i);
    });
});

describe('ExternalCell - User Interactions', () => {
    beforeEach(() => {
        jest.useRealTimers();
    });
    afterEach(() => {
        cleanup();
        jest.clearAllMocks();
    });


    test('when closing the dialog via onClose, the dialog is closed', async () => {
        api.get.mockResolvedValue({
            data: {
                rows: [{ id: 2, cells: [{ columnId: 3, value: 'Some Value' }] }],
            },
        });
        render(<ExternalCell cell={{ value: validCellValue }} {...defaultProps} />);
        await screen.findByText('Some Value');

        fireEvent.doubleClick(screen.getByTestId('external-text'));
        await screen.findByTestId('select-record-dialog');

        expect(screen.getByTestId('select-self')).toBeInTheDocument();
        expect(screen.getByTestId('select-different')).toBeInTheDocument();

        await userEvent.click(screen.getByTestId('close-dialog'));

        await waitFor(() => expect(screen.queryByTestId('select-self')).toBeNull(), { timeout: 10000 });
        await waitFor(() => expect(screen.queryByTestId('select-different')).toBeNull(), { timeout: 10000 });
    });

    test('When the component is unmounted, the timer is cleared.', async () => {
        api.get.mockResolvedValue({
            data: {
                rows: [{ id: 2, cells: [{ columnId: 3, value: 'Some Value' }] }],
            },
        });
        const { unmount } = render(
            <ExternalCell cell={{ value: validCellValue }} {...defaultProps} />
        );
        await screen.findByText('Some Value');
        unmount();
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(api.get.mock.calls.length).toBeLessThanOrEqual(2);
    });
});