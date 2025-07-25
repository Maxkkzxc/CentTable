import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    List, ListItem, ListItemText, Button, TextField, CircularProgress, Box
} from '@mui/material';
import api from '../services/axiosInstance';

function SelectRecordDialog({ open, onClose, onSelect, linkedGridId, linkedColumnId }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (open && linkedGridId) {
            loadRows();
        }
    }, [open, linkedGridId]);

    const loadRows = async () => {
        setLoading(true);
        try {
            const res = await api.get(`datagrid/${linkedGridId}`);
            const rawRows = res.data.rows || [];
            setRows(rawRows);
        } catch (err) {
            console.error('Ошибка загрузки записей:', err);
        } finally {
            setLoading(false);
        }
    };

    const getDisplayValue = (cell, rowId) => {
        if (!cell?.value) return '(пусто)';
        try {
            const parsed = JSON.parse(cell.value);
            if (Array.isArray(parsed)) {
                return parsed.map(item => item.display || `(ID: ${item.rowId})`).join(', ');
            } else if (typeof parsed === 'object') {
                if (parsed.display && parsed.display !== '(пусто)') return parsed.display;
                if (parsed.rowId) {
                    const linkedRow = rows.find(r => r.id === parsed.rowId);
                    const linkedCell = linkedRow?.cells.find(c => c.columnId === linkedColumnId);
                    return linkedCell?.value || `(ID: ${parsed.rowId})`;
                }
            }
            return cell.value;
        } catch {
            return cell.value;
        }
    };

    const filteredRows = rows.filter(row => {
        const cell = row.cells.find(c => c.columnId === linkedColumnId);
        const displayValue = getDisplayValue(cell, row.id);
        return !search || displayValue.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <DialogTitle>Выбор записи</DialogTitle>
            <DialogContent>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Поиск..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ mb: 2 }}
                />

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <List dense>
                        {filteredRows.length > 0 ? filteredRows.map(row => {
                            const cell = row.cells.find(c => c.columnId === linkedColumnId);
                            const displayValue = getDisplayValue(cell, row.id);

                            return (
                                <ListItem
                                    button
                                    key={row.id}
                                    onClick={() => {
                                        onSelect({
                                            rowId: row.id,
                                            display: displayValue
                                        });
                                    }}
                                >
                                    <ListItemText
                                        primary={displayValue}
                                        secondary={`ID: ${row.id}`}
                                    />
                                </ListItem>
                            );
                        }) : (
                            <ListItem>
                                <ListItemText primary="Нет подходящих записей" />
                            </ListItem>
                        )}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Отмена</Button>
            </DialogActions>
        </Dialog>
    );
}

export default SelectRecordDialog;