import React, { useState, useEffect } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Container,
    Card,
    CardContent,
    IconButton,
    TextField,
    Checkbox,
    FormControlLabel,
    MenuItem,
    Box,
    Radio,
    RadioGroup,
    FormControl,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import api from '../services/axiosInstance';
import Cookies from 'js-cookie';


const columnTypeOptions = [
    { value: "String", label: "Строка" },
    { value: "Numeric", label: "Числовое" },
    { value: "Email", label: "Email" },
    { value: "RegExp", label: "Регулярное выражение" },
    { value: "External", label: "Внешняя ссылка" },
    { value: "SingleSelect", label: "Одиночный выбор" },
    { value: "MultiSelect", label: "Множественный выбор" }
];

function Dashboard() {
    const navigate = useNavigate();
    const [dataGrids, setDataGrids] = useState([]);
    const [loading, setLoading] = useState(true);

    const [openCreate, setOpenCreate] = useState(false);
    const [newGridName, setNewGridName] = useState('');
    const [newGridIsPublic, setNewGridIsPublic] = useState(true);
    const [createColumns, setCreateColumns] = useState([
        { name: '', type: 'String', isRequired: false, validationRegex: '', options: '', initialValue: '' }
    ]);

    useEffect(() => {
        fetchDataGrids();
    }, []);

    const fetchDataGrids = async () => {
        try {
            const response = await api.get('datagrid');
            setDataGrids(response.data);
        } catch (err) {
            console.error('Ошибка при получении таблиц:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Cookies.remove('token');
        navigate('/login', { replace: true });
    };

    const handleOpenCreate = () => {
        setOpenCreate(true);
    };

    const handleCloseCreate = () => {
        setOpenCreate(false);
        resetCreateForm();
    };

    const resetCreateForm = () => {
        setNewGridName('');
        setNewGridIsPublic(true);
        setCreateColumns([
            { name: '', type: 'String', isRequired: false, validationRegex: '', options: '', initialValue: '' }
        ]);
    };

    const handleAddCreateColumn = () => {
        setCreateColumns([
            ...createColumns,
            { name: '', type: 'String', isRequired: false, validationRegex: '', options: '', initialValue: '' }
        ]);
    };

    const handleRemoveCreateColumn = (index) => {
        setCreateColumns(createColumns.filter((_, i) => i !== index));
    };

    const handleCreateColumnChange = (index, field, value) => {
        const newCols = [...createColumns];
        newCols[index][field] = value;
        if (field === 'type' && (value === 'SingleSelect' || value === 'MultiSelect')) {
            newCols[index].initialValue = '';
        }
        setCreateColumns(newCols);
    };

    const handleCreateGrid = async () => {
        const payload = {
            name: newGridName,
            isPublic: newGridIsPublic,
            columns: createColumns.filter(c => c.name.trim() !== '')
        };

        try {
            const response = await api.post('datagrid', payload);
            const newGrid = response.data;

            if (!newGrid.rows || newGrid.rows.length === 0) {
                const mergedColumns = newGrid.columns.map((col, index) => {
                    if (col.type === 'SingleSelect' || col.type === 'MultiSelect') {
                        return col;
                    }
                    return { ...col, initialValue: createColumns[index].initialValue || "" };
                });
                newGrid.rows = [
                    {
                        id: 0,
                        cells: mergedColumns.map(col => {
                            if (col.type === 'SingleSelect' || col.type === 'MultiSelect') {
                                return { columnId: col.id, value: null };
                            }
                            return { columnId: col.id, value: col.initialValue };
                        })
                    }
                ];
            }
            setDataGrids([...dataGrids, newGrid]);
            handleCloseCreate();
        } catch (err) {
            console.error("Ошибка при создании таблицы:", err.response ? err.response.data : err.message);
            alert("Ошибка при создании таблицы");
        }
    };

    const updateGrid = async (updatedGrid) => {
        try {
            await api.put(`datagrid/${updatedGrid.id}`, updatedGrid);
            setDataGrids(prev => prev.map(g => g.id === updatedGrid.id ? updatedGrid : g));
        } catch (err) {
            console.error("Ошибка при обновлении таблицы:", err.response ? err.response.data : err.message);
            alert("Ошибка при обновлении таблицы");
        }
    };

    const handleCellChangeImmediate = (gridId, rowId, columnId, newValue) => {
        setDataGrids(prev =>
            prev.map(grid => {
                if (grid.id === gridId) {
                    const newRows = (grid.rows || []).map(row => {
                        if (row.id === rowId) {
                            const newCells = (row.cells || []).map(cell =>
                                cell.columnId === columnId ? { ...cell, value: newValue } : cell
                            );
                            return { ...row, cells: newCells };
                        }
                        return row;
                    });
                    const updatedGrid = { ...grid, rows: newRows };
                    updateGrid(updatedGrid);
                    return updatedGrid;
                }
                return grid;
            })
        );
    };

    const handleMultiSelectCellChange = (gridId, rowId, columnId, option) => {
        setDataGrids(prev =>
            prev.map(grid => {
                if (grid.id === gridId) {
                    const newRows = (grid.rows || []).map(row => {
                        if (row.id === rowId) {
                            const cell = (row.cells || []).find(c => c.columnId === columnId);
                            let current = cell && cell.value ? cell.value.split(',').map(s => s.trim()).filter(s => s) : [];
                            if (current.includes(option)) {
                                current = current.filter(v => v !== option);
                            } else {
                                current.push(option);
                            }
                            const newCells = (row.cells || []).map(c =>
                                c.columnId === columnId ? { ...c, value: current.join(',') } : c
                            );
                            return { ...row, cells: newCells };
                        }
                        return row;
                    });
                    const updatedGrid = { ...grid, rows: newRows };
                    updateGrid(updatedGrid);
                    return updatedGrid;
                }
                return grid;
            })
        );
    };

    const renderGridCard = (grid) => {
        const cols = grid.columns || [];
        const rowsToRender = (grid.rows && grid.rows.length > 0)
            ? grid.rows
            : [{
                id: 0,
                cells: cols.map(col => ({ columnId: col.id, value: "" }))
            }];

        return (
            <Card key={grid.id} variant="outlined" sx={{ mb: 2, p: 1 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6">{grid.name}</Typography>
                    </Box>
                    <Typography variant="body2">{grid.isPublic ? 'Публичная' : 'Приватная'}</Typography>
                    <Box sx={{ mt: 2, overflowX: 'auto' }}>
                        {cols.length > 0 ? (
                            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                <thead>
                                    <tr>
                                        {cols.map(col => (
                                            <th key={col.id} style={{ border: '1px solid #ccc', padding: '4px' }}>
                                                <Typography variant="subtitle2">{col.name}</Typography>
                                                {(col.type === "SingleSelect" || col.type === "MultiSelect") && (
                                                    <Typography variant="caption">Варианты: {col.options}</Typography>
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rowsToRender.map(row => (
                                        <tr key={row.id}>
                                            {cols.map(col => {
                                                const cell = (row.cells || []).find(c => c.columnId === col.id) || { value: "" };
                                                let cellControl = null;
                                                if (col.type === "SingleSelect") {
                                                    const opts = (col.options || "").split(',').map(o => o.trim()).filter(o => o);
                                                    cellControl = (
                                                        <FormControl component="fieldset">
                                                            <RadioGroup
                                                                row
                                                                value={cell.value || ""}
                                                                onChange={(e) =>
                                                                    handleCellChangeImmediate(grid.id, row.id, col.id, e.target.value)
                                                                }
                                                            >
                                                                {opts.map((opt, idx) => (
                                                                    <FormControlLabel key={idx} value={opt} control={<Radio />} label={opt} />
                                                                ))}
                                                            </RadioGroup>
                                                        </FormControl>
                                                    );
                                                } else if (col.type === "MultiSelect") {
                                                    const opts = (col.options || "").split(',').map(o => o.trim()).filter(o => o);
                                                    const selected = cell.value ? cell.value.split(',').map(s => s.trim()).filter(s => s) : [];
                                                    cellControl = (
                                                        <Box>
                                                            {opts.map((opt, idx) => (
                                                                <FormControlLabel
                                                                    key={idx}
                                                                    control={
                                                                        <Checkbox
                                                                            checked={selected.includes(opt)}
                                                                            onChange={() =>
                                                                                handleMultiSelectCellChange(grid.id, row.id, col.id, opt)
                                                                            }
                                                                        />
                                                                    }
                                                                    label={opt}
                                                                />
                                                            ))}
                                                        </Box>
                                                    );
                                                } else {
                                                    cellControl = (
                                                        <Typography variant="body2">{cell.value || ""}</Typography>
                                                    );
                                                }
                                                return (
                                                    <td key={col.id} style={{ border: '1px solid #ccc', padding: '4px' }}>
                                                        {cellControl}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <Typography variant="caption">Нет данных для отображения.</Typography>
                        )}
                    </Box>
                </CardContent>
            </Card>
        );
    };

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        CentTable Dashboard
                    </Typography>
                    <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
                        Выйти
                    </Button>
                </Toolbar>
            </AppBar>
            <Container sx={{ mt: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Таблицы
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreate}
                    sx={{ mb: 2 }}
                >
                    Создать таблицу
                </Button>
                {loading ? (
                    <Typography>Загрузка...</Typography>
                ) : (
                    dataGrids.map(grid => renderGridCard(grid))
                )}
            </Container>

            <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="md">
                <DialogTitle>Создать новую таблицу</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Название таблицы"
                        fullWidth
                        value={newGridName}
                        onChange={(e) => setNewGridName(e.target.value)}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={newGridIsPublic}
                                onChange={(e) => setNewGridIsPublic(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Публичная таблица"
                    />
                    <Typography variant="subtitle1" sx={{ mt: 2 }}>
                        Колонки
                    </Typography>
                    {createColumns.map((col, index) => (
                        <Box key={index} sx={{ mb: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <TextField
                                    label="Название"
                                    value={col.name}
                                    onChange={(e) => handleCreateColumnChange(index, 'name', e.target.value)}
                                />
                                <TextField
                                    select
                                    label="Тип"
                                    value={col.type}
                                    onChange={(e) => handleCreateColumnChange(index, 'type', e.target.value)}
                                    sx={{ minWidth: 150 }}
                                >
                                    {columnTypeOptions.map(option => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={col.isRequired}
                                            onChange={(e) => handleCreateColumnChange(index, 'isRequired', e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label="Обязательно"
                                />
                                {col.type === 'RegExp' && (
                                    <TextField
                                        label="Регулярное выражение"
                                        value={col.validationRegex}
                                        onChange={(e) => handleCreateColumnChange(index, 'validationRegex', e.target.value)}
                                    />
                                )}
                                {(col.type === 'SingleSelect' || col.type === 'MultiSelect') && (
                                    <TextField
                                        label="Варианты (через запятую)"
                                        value={col.options}
                                        onChange={(e) => handleCreateColumnChange(index, 'options', e.target.value)}
                                    />
                                )}
                                {(col.type !== 'SingleSelect' && col.type !== 'MultiSelect') && (
                                    <TextField
                                        label="Начальное значение"
                                        value={col.initialValue}
                                        onChange={(e) => handleCreateColumnChange(index, 'initialValue', e.target.value)}
                                        type={col.type === 'Numeric' ? 'number' : 'text'}
                                    />
                                )}
                                <IconButton onClick={() => handleRemoveCreateColumn(index)}>
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        </Box>
                    ))}
                    <Button onClick={handleAddCreateColumn} color="primary" sx={{ mt: 1 }}>
                        Добавить колонку
                    </Button>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCreate} color="secondary">
                        Отмена
                    </Button>
                    <Button onClick={handleCreateGrid} color="primary">
                        Создать
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default Dashboard;
