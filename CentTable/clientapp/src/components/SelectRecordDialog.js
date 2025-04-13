import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, Button, DialogActions } from '@mui/material';
import api from '../services/axiosInstance';

function SelectRecordDialog({ open, onClose, onSelect, currentGridId, currentRowId, columnId }) {
    const [records, setRecords] = useState([]);

    useEffect(() => {
        if (open) {
            api.get('datagrid/all-records')
                .then(res => setRecords(res.data))
                .catch(err => console.error("Ошибка получения записей", err));
        }
    }, [open]);

    const filteredRecords = records.filter(record => {
        return !(Number(record.gridId) === Number(currentGridId) && Number(record.rowId) === Number(currentRowId));
    });

    const items = [];
    filteredRecords.forEach(record => {
        if (record.columns && record.cellValues) {
            record.columns.forEach(col => {
                const rawValue = record.cellValues[col.id];
                if (rawValue && rawValue.trim() !== "") {
                    let displayValue = rawValue;
                    if (rawValue.trim().startsWith("{")) {
                        try {
                            const parsed = JSON.parse(rawValue);
                            if (parsed && parsed.gridId && parsed.rowId && parsed.targetColumnId) {
                                displayValue = "Внешняя ссылка";
                            }
                        } catch (e) {
                        }
                    }
                    items.push({
                        gridId: record.gridId,
                        gridName: record.gridName,
                        rowId: record.rowId,
                        targetColumnId: col.id,
                        targetColumnName: col.name,
                        value: displayValue
                    });
                }
            });
        }
    });

    const handleSelect = (item) => {
        onSelect(item);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <DialogTitle>Выберите ячейку</DialogTitle>
            <DialogContent>
                <List>
                    {items.map(item => (
                        <ListItem button key={`${item.gridId}-${item.rowId}-${item.targetColumnId}`} onClick={() => handleSelect(item)}>
                            <ListItemText
                                primary={`${item.targetColumnName}: ${item.value}`}
                                secondary={`Таблица: ${item.gridName}`}
                            />
                        </ListItem>
                    ))}
                    {items.length === 0 && (
                        <ListItem>
                            <ListItemText primary="Нет записей с данными" />
                        </ListItem>
                    )}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Отмена</Button>
            </DialogActions>
        </Dialog>
    );
}

export default SelectRecordDialog;