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
    DialogActions,
    Tooltip,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteIcon from '@mui/icons-material/Delete';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { useNavigate } from 'react-router-dom';
import api from '../services/axiosInstance';
import Cookies from 'js-cookie';
import PermissionDialog from '../components/PermissionDialog';
import ExternalCell from '../components/ExternalCell';

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Ошибка декодирования токена', error);
        return null;
    }
}

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
        { name: '', type: 'String', validationRegex: '', options: '' }
    ]);

    const [openEdit, setOpenEdit] = useState(false);
    const [editingGrid, setEditingGrid] = useState(null);
    const [editGridName, setEditGridName] = useState('');
    const [editGridIsPublic, setEditGridIsPublic] = useState(true);
    const [editColumns, setEditColumns] = useState([]);

    const [editingCell, setEditingCell] = useState(null);
    const [editingValue, setEditingValue] = useState("");

    const [userInfo, setUserInfo] = useState({ login: '', role: '' });
    const [openPermissionDialog, setOpenPermissionDialog] = useState(false);
    const [selectedGridForPermission, setSelectedGridForPermission] = useState(null);

    const [selectedRows, setSelectedRows] = useState({});
    const [clipboard, setClipboard] = useState({ rows: null, sourceGridId: null });

    const [selectedGridId, setSelectedGridId] = useState(null);

    const columnWidth = 150;

    const isAdmin = userInfo.role === 'Admin';

    useEffect(() => {
        const token = Cookies.get('token');
        if (token) {
            const decoded = parseJwt(token);
            if (decoded) {
                setUserInfo({
                    login: decoded.unique_name || 'Неизвестно',
                    role: decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || 'Пользователь'
                });
            }
        }
        fetchDataGrids();
    }, []);

    useEffect(() => {
        if (dataGrids.length > 0 && !selectedGridId) {
            setSelectedGridId(dataGrids[0].id);
        }
    }, [dataGrids, selectedGridId]);

    useEffect(() => {
        setSelectedRows({});
        setClipboard({ rows: null, sourceGridId: null });
    }, [selectedGridId]);

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
        window.location.reload();
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
        setCreateColumns([{ name: '', type: 'String', validationRegex: '', options: '' }]);
    };

    const handleAddCreateColumn = () => {
        setCreateColumns([...createColumns, { name: '', type: 'String', validationRegex: '', options: '' }]);
    };

    const handleRemoveCreateColumn = (index) => {
        setCreateColumns(createColumns.filter((_, i) => i !== index));
    };

    const handleCreateColumnChange = (index, field, value) => {
        const newCols = [...createColumns];
        newCols[index][field] = value;
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
                newGrid.rows = [{
                    id: 0,
                    cells: newGrid.columns.map(col => ({
                        columnId: col.id,
                        value: ""
                    }))
                }];
            }
            setDataGrids([...dataGrids, newGrid]);
            setSelectedGridId(newGrid.id);
            handleCloseCreate();
        } catch (err) {
            console.error("Ошибка при создании таблицы:", err.response ? err.response.data : err.message);
            alert("Ошибка при создании таблицы");
        }
    };

    const updateGrid = async (updatedGrid) => {
        try {
            const response = await api.put(`datagrid/${updatedGrid.id}`, updatedGrid);
            setDataGrids(prev => prev.map(g => g.id === updatedGrid.id ? response.data : g));
        } catch (err) {
            console.error("Ошибка при обновлении таблицы:", err.response ? err.response.data : err.message);
            alert("Ошибка при обновлении таблицы");
        }
    };

    const handleCellClick = (gridId, rowId, columnId, currentValue) => {
        setEditingCell({ gridId, rowId, columnId });
        setEditingValue(currentValue || "");
    };

    const handleCellBlur = (gridId, rowId, columnId, newValue) => {
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
        setEditingCell(null);
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

    const handleOpenEdit = (grid) => {
        setEditingGrid(grid);
        setEditGridName(grid.name);
        setEditGridIsPublic(grid.isPublic);
        const cols = grid.columns.map(col => ({
            id: col.id,
            name: col.name,
            type: col.type,
            validationRegex: col.validationRegex,
            options: col.options
        }));
        setEditColumns(cols);
        setOpenEdit(true);
    };

    const handleCloseEdit = () => {
        setOpenEdit(false);
        setEditingGrid(null);
        setEditGridName('');
        setEditGridIsPublic(true);
        setEditColumns([]);
    };

    const handleAddEditColumn = () => {
        setEditColumns([...editColumns, { id: 0, name: '', type: 'String', validationRegex: '', options: '' }]);
    };

    const handleRemoveEditColumn = (index) => {
        setEditColumns(editColumns.filter((_, i) => i !== index));
    };

    const handleEditColumnChange = (index, field, value) => {
        const newCols = [...editColumns];
        newCols[index][field] = value;
        setEditColumns(newCols);
    };

    const handleEditGrid = async () => {
        const processedColumns = editColumns
            .filter(c => c.name.trim() !== '')
            .map(({ id, name, type, validationRegex, options }) => ({
                id, name, type, validationRegex, options
            }));

        const payload = {
            name: editGridName,
            isPublic: editGridIsPublic,
            columns: processedColumns,
            rows: editingGrid.rows
        };

        try {
            const response = await api.put(`datagrid/${editingGrid.id}`, payload);
            setDataGrids(prev => prev.map(g => g.id === editingGrid.id ? response.data : g));
            handleCloseEdit();
        } catch (err) {
            console.error("Ошибка при обновлении таблицы:", err.response ? err.response.data : err.message);
            alert("Ошибка при обновлении таблицы");
        }
    };

    const handleAddRecord = (grid) => {
        const newRow = {
            id: 0,
            cells: grid.columns.map(col => ({
                columnId: col.id,
                value: ""
            }))
        };
        const updatedGrid = { ...grid, rows: [...(grid.rows || []), newRow] };
        updateGrid(updatedGrid);
    };

    const handleDeleteGrid = async (gridId) => {
        if (window.confirm("Вы уверены, что хотите удалить таблицу?")) {
            try {
                await api.delete(`datagrid/${gridId}`);
                setDataGrids(prev => prev.filter(g => g.id !== gridId));
                if (selectedGridId === gridId) {
                    setSelectedGridId(null);
                }
            } catch (err) {
                console.error("Ошибка при удалении таблицы:", err.response ? err.response.data : err.message);
                alert("Ошибка при удалении таблицы");
            }
        }
    };

    const handleOpenPermissionDialog = (grid) => {
        setSelectedGridForPermission(grid);
        setOpenPermissionDialog(true);
    };

    const handleRowSelection = (gridId, rowId, isChecked) => {
        setSelectedRows(prev => {
            const prevRows = prev[gridId] || [];
            if (isChecked) {
                return { ...prev, [gridId]: [...prevRows, rowId] };
            } else {
                return { ...prev, [gridId]: prevRows.filter(id => id !== rowId) };
            }
        });
    };

    const handleBatchDelete = async (gridId) => {
        const rowsToDelete = selectedRows[gridId];
        if (!rowsToDelete || rowsToDelete.length === 0) {
            alert("Нет выбранных строк для удаления");
            return;
        }
        try {
            await api.post('datagrid/batch-delete', { RowIds: rowsToDelete });
            fetchDataGrids();
            setSelectedRows(prev => ({ ...prev, [gridId]: [] }));
        } catch (err) {
            console.error("Ошибка пакетного удаления:", err);
            alert("Ошибка пакетного удаления");
        }
    };

    const handleCopySelected = (grid) => {
        const rowsToCopy = selectedRows[grid.id];
        if (!rowsToCopy || rowsToCopy.length === 0) {
            alert("Нет выбранных строк для копирования");
            return;
        }

        const copiedRows = grid.rows.filter(row => rowsToCopy.includes(row.id)).map(row => {
            return {
                Cells: row.cells.map(cell => {
                    const column = grid.columns.find(col => Number(col.id) === Number(cell.columnId));
                    return {
                        ColumnId: cell.columnId,
                        ColumnName: column ? column.name : "",
                        Value: cell.value
                    };
                })
            };
        });

        setClipboard({ rows: copiedRows, sourceGridId: grid.id });
        alert("Строки скопированы");
    };

    const handlePasteCopied = async (grid) => {
        if (!clipboard.rows || clipboard.rows.length === 0) {
            alert("Буфер пуст. Сначала скопируйте строки.");
            return;
        }
        const payload = {
            DataGridId: grid.id,
            Rows: clipboard.rows.map(row => ({
                Cells: row.Cells.map(cell => ({
                    ColumnId: cell.ColumnId,
                    ColumnName: cell.ColumnName,
                    Value: cell.Value
                }))
            }))
        };

        try {
            const res = await api.post('datagrid/batch-insert', payload);
            alert(`Успешная вставка`);
            fetchDataGrids();
            setSelectedRows(prev => ({ ...prev, [grid.id]: [] }));
            setClipboard({ rows: null, sourceGridId: null });
        } catch (err) {
            console.error("Ошибка при вставке скопированных строк:", err);
            alert("Ошибка при вставке строк");
        }
    };

    const renderGridCard = (grid, columnWidth) => {
        return (
            <Card key={grid.id} variant="outlined" sx={{ mb: 2, p: 1 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="h6">{grid.name}</Typography>
                        <Box>
                            <Button variant="outlined" size="small" onClick={() => handleAddRecord(grid)} sx={{ mr: 1 }}>
                                Добавить запись
                            </Button>
                            <Button variant="outlined" size="small" onClick={() => handleOpenEdit(grid)} sx={{ mr: 1 }}>
                                Редактировать
                            </Button>
                            {isAdmin && (
                                <Button variant="outlined" size="small" onClick={() => handleOpenPermissionDialog(grid)} sx={{ mr: 1 }}>
                                    Управление правами
                                </Button>
                            )}
                            <IconButton onClick={() => handleDeleteGrid(grid.id)}>
                                <DeleteIcon color="error" />
                            </IconButton>
                        </Box>
                    </Box>
                    <Box sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Tooltip title="Удалить выбранные строки">
                            <IconButton color="secondary" onClick={() => handleBatchDelete(grid.id)}>
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Копировать выбранные строки">
                            <IconButton color="primary" onClick={() => handleCopySelected(grid)}>
                                <FileCopyIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Вставить скопированные строки">
                            <IconButton color="success" onClick={() => handlePasteCopied(grid)}>
                                <ContentPasteIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <Typography variant="body2">
                        {grid.isPublic ? 'Публичная' : 'Приватная'}
                    </Typography>
                    <Box sx={{ mt: 2, overflowX: 'auto' }}>
                        {grid.columns && grid.columns.length > 0 ? (
                            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: '1px solid #ccc', padding: '4px', width: '40px' }}>✓</th>
                                        {grid.columns.map(col => (
                                            <th key={col.id} style={{ border: '1px solid #ccc', padding: '4px', minWidth: columnWidth }}>
                                                <Typography variant="subtitle2">{col.name}</Typography>
                                                {(col.type === "SingleSelect" || col.type === "MultiSelect") && (
                                                    <Typography variant="caption">Варианты: {col.options}</Typography>
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {grid.rows && grid.rows.length > 0 ? (
                                        grid.rows.map(row => (
                                            <tr key={row.id}>
                                                <td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>
                                                    <Checkbox
                                                        checked={selectedRows[grid.id]?.includes(row.id) || false}
                                                        onChange={(e) => handleRowSelection(grid.id, row.id, e.target.checked)}
                                                    />
                                                </td>
                                                {grid.columns.map(col => {
                                                    const cell = (row.cells || []).find(c => Number(c.columnId) === Number(col.id)) || { value: "" };
                                                    let cellControl = null;
                                                    if (col.type === "External") {
                                                        cellControl = (
                                                            <ExternalCell
                                                                cell={cell}
                                                                currentGridId={grid.id}
                                                                currentRowId={row.id}
                                                                onUpdate={(newValue) =>
                                                                    handleCellChangeImmediate(grid.id, row.id, col.id, newValue)
                                                                }
                                                            />
                                                        );
                                                    } else if (col.type === "SingleSelect") {
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
                                                        const selected = cell.value ? cell.value.split(',').map(s => s.trim()) : [];
                                                        cellControl = (
                                                            <Box>
                                                                {opts.map((opt, idx) => (
                                                                    <FormControlLabel
                                                                        key={idx}
                                                                        control={
                                                                            <Checkbox
                                                                                checked={selected.includes(opt)}
                                                                                onChange={() =>
                                                                                    handleCellChangeImmediate(
                                                                                        grid.id,
                                                                                        row.id,
                                                                                        col.id,
                                                                                        selected.includes(opt)
                                                                                            ? selected.filter(v => v !== opt).join(',')
                                                                                            : [...selected, opt].join(',')
                                                                                    )
                                                                                }
                                                                            />
                                                                        }
                                                                        label={opt}
                                                                    />
                                                                ))}
                                                            </Box>
                                                        );
                                                    } else {
                                                        if (
                                                            editingCell &&
                                                            editingCell.gridId === grid.id &&
                                                            editingCell.rowId === row.id &&
                                                            editingCell.columnId === col.id
                                                        ) {
                                                            cellControl = (
                                                                <TextField
                                                                    type={col.type === "Numeric" ? "number" : "text"}
                                                                    value={editingValue}
                                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                                    onBlur={() => handleCellBlur(grid.id, row.id, col.id, editingValue)}
                                                                    autoFocus
                                                                    variant="standard"
                                                                    multiline={col.type !== "Numeric"}
                                                                    fullWidth
                                                                />
                                                            );
                                                        } else {
                                                            cellControl = (
                                                                <Typography
                                                                    variant="body2"
                                                                    onDoubleClick={() =>
                                                                        handleCellClick(grid.id, row.id, col.id, cell.value)
                                                                    }
                                                                    style={{ cursor: "pointer", whiteSpace: "pre-wrap", minHeight: "24px" }}
                                                                >
                                                                    {cell.value || "\u00A0"}
                                                                </Typography>
                                                            );
                                                        }
                                                    }
                                                    return (
                                                        <td key={col.id} style={{ border: "1px solid #ccc", padding: "4px", minWidth: columnWidth }}>
                                                            {cellControl}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={grid.columns.length + 1} style={{ textAlign: "center", padding: "8px" }}>
                                                Нет данных для отображения.
                                            </td>
                                        </tr>
                                    )}
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

    const selectedGrid = dataGrids.find(grid => grid.id === selectedGridId);

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        CentTable Dashboard
                    </Typography>
                    <Box sx={{ mr: 2, textAlign: "right" }}>
                        <Typography variant="body2">{userInfo.login}</Typography>
                        <Typography variant="caption">{userInfo.role}</Typography>
                    </Box>
                    <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
                        Выйти
                    </Button>
                </Toolbar>
            </AppBar>
            <Container maxWidth={false} sx={{ mt: 2, height: 'calc(100vh - 64px - 16px)' }}>
                <Box sx={{ display: "flex", height: "100%" }}>
                    <Box
                        sx={{
                            minWidth: "200px",
                            borderRight: "1px solid #ccc",
                            overflowY: "auto"
                        }}
                    >
                        <Box sx={{ p: 1 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<AddIcon />}
                                onClick={handleOpenCreate}
                                fullWidth
                            >
                                Создать
                            </Button>
                        </Box>
                        <Divider />
                        {loading ? (
                            <Typography sx={{ mt: 2, p: 1 }}>Загрузка...</Typography>
                        ) : (
                            <List>
                                {dataGrids.map(grid => (
                                    <ListItem key={grid.id} disablePadding>
                                        <ListItemButton
                                            selected={grid.id === selectedGridId}
                                            onClick={() => setSelectedGridId(grid.id)}
                                        >
                                            <ListItemText primary={grid.name} />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>

                    <Box sx={{ flexGrow: 1, overflowX: 'auto', overflowY: 'auto' }}>
                        {selectedGrid ? (
                            renderGridCard(selectedGrid, columnWidth)
                        ) : (
                            <Typography variant="h6" sx={{ mt: 4, textAlign: "center" }}>
                                Выберите таблицу из списка слева
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Container>

            <Dialog open={openCreate} onClose={handleCloseCreate} fullWidth maxWidth="md">
                <DialogTitle sx={{ backgroundColor: 'rgb(33, 33, 33)', color: 'white' }}>
                    Создать новую таблицу
                </DialogTitle>
                <DialogContent sx={{ backgroundColor: 'rgb(33, 33, 33)', color: 'white' }}>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Название таблицы"
                        fullWidth
                        value={newGridName}
                        onChange={(e) => setNewGridName(e.target.value)}
                        variant="outlined"
                        sx={{
                            mb: 2,
                            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: 'rgb(48, 48, 48)',
                                color: 'white',
                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                '&:hover fieldset': { borderColor: '#1976d2' },
                            },
                        }}
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
                        sx={{ color: 'white' }}
                    />
                    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, color: 'white' }}>
                        Колонки
                    </Typography>
                    {createColumns.map((col, index) => (
                        <Box key={index} sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                            <TextField
                                label="Название"
                                value={col.name}
                                onChange={(e) => handleCreateColumnChange(index, 'name', e.target.value)}
                                variant="outlined"
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: 'rgb(48, 48, 48)',
                                        color: 'white',
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                        '&:hover fieldset': { borderColor: '#1976d2' },
                                    },
                                }}
                            />
                            <TextField
                                select
                                label="Тип"
                                value={col.type}
                                onChange={(e) => handleCreateColumnChange(index, 'type', e.target.value)}
                                variant="outlined"
                                size="small"
                                sx={{
                                    minWidth: 150,
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: 'rgb(48, 48, 48)',
                                        color: 'white',
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                        '&:hover fieldset': { borderColor: '#1976d2' },
                                    },
                                }}
                            >
                                {columnTypeOptions.map(option => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                            {col.type === 'RegExp' && (
                                <TextField
                                    label="Регулярное выражение"
                                    value={col.validationRegex}
                                    onChange={(e) => handleCreateColumnChange(index, 'validationRegex', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: 'rgb(48, 48, 48)',
                                            color: 'white',
                                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                            '&:hover fieldset': { borderColor: '#1976d2' },
                                        },
                                    }}
                                />
                            )}
                            {(col.type === 'SingleSelect' || col.type === 'MultiSelect') && (
                                <TextField
                                    label="Варианты (через запятую)"
                                    value={col.options}
                                    onChange={(e) => handleCreateColumnChange(index, 'options', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: 'rgb(48, 48, 48)',
                                            color: 'white',
                                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                            '&:hover fieldset': { borderColor: '#1976d2' },
                                        },
                                    }}
                                />
                            )}
                            <IconButton onClick={() => handleRemoveCreateColumn(index)}>
                                <DeleteIcon sx={{ color: 'white' }} />
                            </IconButton>
                        </Box>
                    ))}
                    <Button onClick={handleAddCreateColumn} color="primary">
                        Добавить колонку
                    </Button>
                </DialogContent>
                <DialogActions sx={{ backgroundColor: 'rgb(33, 33, 33)' }}>
                    <Button onClick={handleCloseCreate} color="secondary">
                        Отмена
                    </Button>
                    <Button onClick={handleCreateGrid} color="primary">
                        Создать
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openEdit} onClose={handleCloseEdit} fullWidth maxWidth="md">
                <DialogTitle sx={{ backgroundColor: 'rgb(33, 33, 33)', color: 'white' }}>
                    Редактировать таблицу
                </DialogTitle>
                <DialogContent sx={{ backgroundColor: 'rgb(33, 33, 33)', color: 'white' }}>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Название таблицы"
                        fullWidth
                        value={editGridName}
                        onChange={(e) => setEditGridName(e.target.value)}
                        variant="outlined"
                        sx={{
                            mb: 2,
                            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: 'rgb(48, 48, 48)',
                                color: 'white',
                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                '&:hover fieldset': { borderColor: '#1976d2' },
                            },
                        }}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={editGridIsPublic}
                                onChange={(e) => setEditGridIsPublic(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Публичная таблица"
                        sx={{ color: 'white' }}
                    />
                    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, color: 'white' }}>
                        Колонки
                    </Typography>
                    {editColumns.map((col, index) => (
                        <Box key={index} sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                            <TextField
                                label="Название"
                                value={col.name}
                                onChange={(e) => handleEditColumnChange(index, 'name', e.target.value)}
                                variant="outlined"
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: 'rgb(48, 48, 48)',
                                        color: 'white',
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                        '&:hover fieldset': { borderColor: '#1976d2' },
                                    },
                                }}
                            />
                            <TextField
                                select
                                label="Тип"
                                value={col.type}
                                onChange={(e) => handleEditColumnChange(index, 'type', e.target.value)}
                                variant="outlined"
                                size="small"
                                sx={{
                                    minWidth: 150,
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: 'rgb(48, 48, 48)',
                                        color: 'white',
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                        '&:hover fieldset': { borderColor: '#1976d2' },
                                    },
                                }}
                            >
                                {columnTypeOptions.map(option => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                            {col.type === 'RegExp' && (
                                <TextField
                                    label="Регулярное выражение"
                                    value={col.validationRegex}
                                    onChange={(e) => handleEditColumnChange(index, 'validationRegex', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: 'rgb(48, 48, 48)',
                                            color: 'white',
                                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                            '&:hover fieldset': { borderColor: '#1976d2' },
                                        },
                                    }}
                                />
                            )}
                            {(col.type === 'SingleSelect' || col.type === 'MultiSelect') && (
                                <TextField
                                    label="Варианты (через запятую)"
                                    value={col.options}
                                    onChange={(e) => handleEditColumnChange(index, 'options', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: 'rgb(48, 48, 48)',
                                            color: 'white',
                                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                            '&:hover fieldset': { borderColor: '#1976d2' },
                                        },
                                    }}
                                />
                            )}
                            <IconButton onClick={() => handleRemoveEditColumn(index)}>
                                <DeleteIcon sx={{ color: 'white' }} />
                            </IconButton>
                        </Box>
                    ))}
                    <Button onClick={handleAddEditColumn} color="primary">
                        Добавить колонку
                    </Button>
                </DialogContent>
                <DialogActions sx={{ backgroundColor: 'rgb(33, 33, 33)' }}>
                    <Button onClick={handleCloseEdit} color="secondary">
                        Отмена
                    </Button>
                    <Button onClick={handleEditGrid} color="primary">
                        Сохранить изменения
                    </Button>
                </DialogActions>
            </Dialog>

            {isAdmin && selectedGridForPermission && (
                <PermissionDialog
                    open={openPermissionDialog}
                    onClose={() => setOpenPermissionDialog(false)}
                    dataGridId={selectedGridForPermission.id}
                    onPermissionsUpdated={fetchDataGrids}
                />
            )}
        </>
    );
}

export default Dashboard;