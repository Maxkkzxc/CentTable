import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SelectRecordDialog from './SelectRecordDialog';
import api from '../services/axiosInstance';

jest.mock('../services/axiosInstance');

describe('SelectRecordDialog', () => {
    const mockOnClose = jest.fn();
    const mockOnSelect = jest.fn();
    const currentGridId = "1";
    const currentRowId = "1";

    const recordsResponse = {
        data: [
            {
                gridId: "2",
                gridName: "Test Grid",
                rowId: "2",
                columns: [
                    { id: "10", name: "Название" }
                ],
                cellValues: {
                    "10": "Значение ячейки"
                }
            },
            {
                gridId: "1", 
                gridName: "Current Grid",
                rowId: "1",
                columns: [
                    { id: "11", name: "Колонка" }
                ],
                cellValues: {
                    "11": "Другое значение"
                }
            }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
        api.get.mockResolvedValue(recordsResponse);
    });

    test('displays a list of records excluding the current one', async () => {
        render(
            <SelectRecordDialog
                open={true}
                onClose={mockOnClose}
                onSelect={mockOnSelect}
                currentGridId={currentGridId}
                currentRowId={currentRowId}
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/Название: Значение ячейки/i)).toBeInTheDocument();
        });

        expect(screen.queryByText(/Колонка/i)).not.toBeInTheDocument();
    });

    test('selecting an item triggers onSelect and onClose', async () => {
        render(
            <SelectRecordDialog
                open={true}
                onClose={mockOnClose}
                onSelect={mockOnSelect}
                currentGridId={currentGridId}
                currentRowId={currentRowId}
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/Название: Значение ячейки/i)).toBeInTheDocument();
        });

        const listItem = screen.getByText(/Название: Значение ячейки/i);
        fireEvent.click(listItem);

        expect(mockOnSelect).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
    });

    test('if there are no records, the message "No records with data" is displayed', async () => {
        api.get.mockResolvedValue({ data: [] });

        render(
            <SelectRecordDialog
                open={true}
                onClose={mockOnClose}
                onSelect={mockOnSelect}
                currentGridId={currentGridId}
                currentRowId={currentRowId}
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/Нет записей с данными/i)).toBeInTheDocument();
        });
    });
});
