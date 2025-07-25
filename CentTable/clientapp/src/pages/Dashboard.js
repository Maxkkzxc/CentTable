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
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import * as XLSX from "xlsx";
import UploadFileIcon from '@mui/icons-material/UploadFile';

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
        {
            name: '',
            type: 'String',
            validationRegex: '',
            options: '',
            maxLength: '',
            minValue: '',
            maxValue: ''
        }
    ]);

    const [openEdit, setOpenEdit] = useState(false);
    const [editingGrid, setEditingGrid] = useState(null);
    const [editGridName, setEditGridName] = useState('');
    const [editGridIsPublic, setEditGridIsPublic] = useState(true);
    const [editColumns, setEditColumns] = useState([]);


    const [editingCell, setEditingCell] = useState(null);
    const [editingValue, setEditingValue] = useState("");

    const [userInfo, setUserInfo] = useState({ login: '', role: '', id: '' });
    const [openPermissionDialog, setOpenPermissionDialog] = useState(false);
    const [selectedGridForPermission, setSelectedGridForPermission] = useState(null);

    const [selectedRows, setSelectedRows] = useState({});
    const [clipboard, setClipboard] = useState({ rows: null, sourceGridId: null });
    const [selectedGridId, setSelectedGridId] = useState(null);
    const [currentGridId, setCurrentGridId] = useState(null);

    const columnWidth = 150;
    const isAdmin = userInfo.role === 'Admin';

    const getGridPermissions = (grid) => {
        if (grid.isPublic) {
            return { canView: true, canEdit: true, canDelete: true };
        }
        if (isAdmin) {
            return { canView: true, canEdit: true, canDelete: true };
        }
        const permission = grid.permissions?.find(p => p.userId === userInfo.id);
        return permission || { canView: false, canEdit: false, canDelete: false };
    };

    useEffect(() => {
        const token = Cookies.get('token');
        if (token) {
            const decoded = parseJwt(token);
            if (decoded) {
                setUserInfo({
                    login: decoded.unique_name || 'Неизвестно',
                    role: decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || 'Пользователь',
                    id: decoded.nameid || decoded.sub || ''
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
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyC' || e.code === 'KeyV')) {
                const grid = dataGrids.find(g => g.id === selectedGridId);
                if (!grid) return;

                e.preventDefault();
                if (e.code === 'KeyC') handleCopySelected(grid);
                if (e.code === 'KeyV') handlePasteCopied(grid);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedGridId, dataGrids, selectedRows]);


    const fetchSingleGrid = async (gridId) => {
        try {
            const res = await api.get(`datagrid/${gridId}`);
            setDataGrids(prev =>
                prev.map(g => g.id === gridId ? res.data : g)
            );
        } catch (err) {
            console.error(`Не удалось дозагрузить таблицу ${gridId}:`, err);
        }
    };

    const fetchDataGrids = async () => {
        try {
            const response = await api.get('datagrid');
            setDataGrids(response.data);
        } catch (err) {
            console.error('Ошибка при получении таблиц:', err);
            toast.error("Ошибка при получении таблиц");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Cookies.remove('token');
        navigate('/login', { replace: true });
        window.location.reload();
    };

    const validateCellValue = (column, value) => {
        if (column.type === "RegExp" && column.validationRegex) {
            try {
                const regex = new RegExp(column.validationRegex);
                if (!regex.test(value)) {
                    toast.error("Значение не соответствует выражению");
                    return false;
                }
            } catch (error) {
                toast.error("Ошибка в регулярном выражении колонки");
                return false;
            }
        }

        if (column.type === "Email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                toast.error("Некорректный email");
                return false;
            }
        }
        return true;
    };

    const handleCellClick = (gridId, rowId, columnId, currentValue) => {
        const grid = dataGrids.find(g => g.id === gridId);
        if (!grid) return;
        const { canEdit } = getGridPermissions(grid);
        if (!canEdit) {
            toast.info("У вас нет прав для редактирования этой таблицы");
            return;
        }
        setEditingCell({ gridId, rowId, columnId });
        setEditingValue(currentValue || "");
    };

    const handleCellBlur = (gridId, rowId, columnId, newValue) => {
        const grid = dataGrids.find(g => g.id === gridId);
        if (!grid) return;

        const col = grid.columns.find(c => c.id === columnId);
        if (col && !validateCellValue(col, newValue)) {
            setEditingCell(null);
            return;
        }

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
        const grid = dataGrids.find(g => g.id === gridId);
        if (!grid) return;
        const { canEdit } = getGridPermissions(grid);
        if (!canEdit) {
            toast.info("У вас нет прав для редактирования этой таблицы");
            return;
        }
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
            { name: '', type: 'String', validationRegex: '', options: '', maxLength: '', minValue: '', maxValue: '' }
        ]);
    };

    const handleAddCreateColumn = () => {
        setCreateColumns([...createColumns, { name: '', type: 'String', validationRegex: '', options: '', maxLength: '', minValue: '', maxValue: '' }]);
    };

    const handleRemoveCreateColumn = (index) => {
        setCreateColumns(createColumns.filter((_, i) => i !== index));
    };

    const handleCreateColumnChange = (index, field, value) => {
        const newCols = [...createColumns];
        newCols[index][field] = value;

        if (field === 'linkedGridId') {
            const selectedGrid = dataGrids.find(g => g.id === value);
            const firstStringCol = selectedGrid?.columns.find(c => c.type === 'String');
            newCols[index]['linkedColumnId'] = firstStringCol?.id || '';
        }

        setCreateColumns(newCols);
    };

    const formatColumnConstraints = (cols) => {
        return cols.map(col => ({
            ...col,
            maxLength: col.maxLength !== '' ? parseInt(col.maxLength, 10) : null,
            minValue: col.minValue !== '' ? parseFloat(col.minValue) : null,
            maxValue: col.maxValue !== '' ? parseFloat(col.maxValue) : null
        })).filter(col => col.name.trim() !== '');
    };

    const handleImportExcel = async (grid, excelData) => {
        if (!excelData || excelData.length < 2) {
            toast.error("Excel файл должен содержать хотя бы заголовки и одну строку данных");
            return;
        }

        const headers = excelData[0].map(h => h.toString().trim());
        const rawTypes = excelData[1] || [];
        const allowedTypes = ["String", "Numeric", "Email", "RegExp", "External", "SingleSelect", "MultiSelect"];

        const hasValidTypeRow = rawTypes.some(cell => {
            const val = cell?.toString().trim();
            return allowedTypes.includes(val);
        });

        const types = headers.map((_, i) => {
            const t = rawTypes[i]?.toString().trim();
            return hasValidTypeRow && allowedTypes.includes(t) ? t : "String";
        });

        let updatedGrid = { ...grid };

        try {
            await api.delete(`datagrid/${grid.id}/rows`);
            updatedGrid.rows = [];
        } catch (err) {
            if (err.response?.status !== 204 && err.response?.status !== 404) {
                toast.error("Не удалось очистить старые строки перед импортом");
                console.error(err);
                return;
            }
        }

        if (!grid.columns || grid.columns.length === 0) {
            const newColumns = headers.map((name, i) => ({
                name,
                type: types[i],
                validationRegex: "",
                options: "",
            }));

            updatedGrid = {
                ...grid,
                columns: newColumns,
            };

            try {
                const response = await api.put(`datagrid/${grid.id}`, updatedGrid);
                updatedGrid = response.data;
            } catch (err) {
                toast.error("Ошибка при создании колонок");
                console.error(err);
                return;
            }
        }

        const columnMap = {};
        headers.forEach((header, i) => {
            const col = updatedGrid.columns.find(c => c.name === header);
            if (col) columnMap[i] = col.id;
        });

        const unmapped = headers.filter((_, i) => columnMap[i] === undefined);
        if (unmapped.length > 0) {
            toast.error(`Не найдены колонки: ${unmapped.join(", ")}`);
            return;
        }

        const dataRows = excelData.slice(hasValidTypeRow ? 2 : 1).filter(row =>
            row.some(cell => cell !== undefined && cell !== null && cell.toString().trim() !== "")
        );

        const rowsToInsert = dataRows.map(row => ({
            cells: headers.map((_, i) => ({
                columnId: columnMap[i],
                value: row[i] !== undefined && row[i] !== null ? row[i].toString() : "",
            })),
        }));

        try {
            await api.post("datagrid/batch-insert", {
                DataGridId: updatedGrid.id,
                Rows: rowsToInsert,
            });

            toast.success(`Импортировано ${rowsToInsert.length} строк`);
            fetchDataGrids();
        } catch (err) {
            toast.error("Ошибка при вставке данных");
            console.error(err);
        }
    };

    const handleCreateGrid = async () => {
        const payload = {
            name: newGridName,
            isPublic: newGridIsPublic,
            columns: formatColumnConstraints(createColumns),
        };

        try {
            const response = await api.post('datagrid/create', payload);
            const newGrid = response.data;

            await fetchDataGrids();

            setSelectedGridId(newGrid.id);

            handleCloseCreate();
        } catch (err) {
            console.error("Ошибка при создании таблицы:", err.response?.data || err.message);
            toast.error("Ошибка при создании таблицы");
        }
    };



    const updateGrid = async (updatedGrid) => {
        try {
            const response = await api.put(`datagrid/${updatedGrid.id}`, updatedGrid);
            setDataGrids(prev => prev.map(g => g.id === updatedGrid.id ? response.data : g));
        } catch (err) {
            console.error("Ошибка при обновлении таблицы:", err.response ? err.response.data : err.message);
            toast.error("Ошибка при обновлении таблицы");
        }
    };

    const handleOpenEdit = (grid) => {
        if (!getGridPermissions(grid).canEdit) {
            toast.info("У вас нет прав для редактирования этой таблицы");
            return;
        }
        setEditingGrid(grid);
        setEditGridName(grid.name);
        setEditGridIsPublic(grid.isPublic);
        const cols = grid.columns.map(col => ({
            id: col.id,
            name: col.name,
            type: col.type,
            validationRegex: col.validationRegex || '',
            options: col.options || '',
            maxLength: col.maxLength != null ? col.maxLength : '',
            minValue: col.minValue != null ? col.minValue : '',
            maxValue: col.maxValue != null ? col.maxValue : ''
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
        setEditColumns([...editColumns, { id: 0, name: '', type: 'String', validationRegex: '', options: '', maxLength: '', minValue: '', maxValue: '' }]);
    };

    const handleRemoveEditColumn = (index) => {
        setEditColumns(editColumns.filter((_, i) => i !== index));
    };

    const handleEditColumnChange = (index, field, value) => {
        setEditColumns(prevColumns => {
            const newColumns = [...prevColumns];
            newColumns[index] = { ...newColumns[index], [field]: value };

            if (field === 'linkedGridId') {
                const selectedGrid = dataGrids.find(g => g.id === value);
                const firstStringCol = selectedGrid?.columns.find(c => c.type === 'String');
                newColumns[index]['linkedColumnId'] = firstStringCol?.id || '';
            }

            return newColumns;
        });
    };

    const handleEditGrid = async () => {
        const processedColumns = formatColumnConstraints(editColumns);
        const payload = {
            name: editGridName,
            isPublic: editGridIsPublic,
            columns: processedColumns,
        };
        console.log('Отправляем payload:', payload);
        try {
            const response = await api.put(`datagrid/${editingGrid.id}`, payload);
            await fetchDataGrids();
            console.log('Ответ сервера:', response.data);
            setDataGrids(prev => prev.map(g => g.id === editingGrid.id ? response.data : g));
            handleCloseEdit();
        } catch (err) {
            console.error("Ошибка при обновлении таблицы:", err.response ? err.response.data : err.message);
            toast.error("Ошибка при обновлении таблицы");
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
        const result = await Swal.fire({
            title: 'Подтверждение',
            text: 'Вы уверены, что хотите удалить таблицу?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Да, удалить!',
            cancelButtonText: 'Отмена',
            theme: 'dark'
        });

        if (result && result.isConfirmed) {
            try {
                await api.delete(`datagrid/${gridId}`);
                setDataGrids(prev => prev.filter(g => g.id !== gridId));
                if (selectedGridId === gridId) {
                    setSelectedGridId(null);
                }
                Swal.fire({
                    title: 'Удалено!',
                    text: 'Таблица была успешно удалена',
                    icon: 'success',
                    theme: 'dark'
                });
            } catch (err) {
                console.error("Ошибка при удалении таблицы:", err.response ? err.response.data : err.message);
                Swal.fire({
                    title: 'Ошибка!',
                    text: 'Ошибка при удалении таблицы',
                    icon: 'error',
                    theme: 'dark'
                });
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
            toast.info("Нет выбранных строк для удаления");
            return;
        }
        try {
            await api.post('datagrid/batch-delete', { RowIds: rowsToDelete });
            fetchDataGrids();
            setSelectedRows(prev => ({ ...prev, [gridId]: [] }));
        } catch (err) {
            console.error("Ошибка пакетного удаления:", err);
            toast.error("Ошибка пакетного удаления");
        }
    };

    const handleCopySelected = (grid) => {
        const rowsToCopy = selectedRows[grid.id];
        if (!rowsToCopy || rowsToCopy.length === 0) {
            toast.info("Нет выбранных строк для копирования");
            return;
        }

        const columns = grid.columns;
        const copiedRows = grid.rows
            .filter(row => rowsToCopy.includes(row.id))
            .map(row => ({
                cells: row.cells.map(cell => ({
                    columnId: cell.columnId,
                    columnName: columns.find(col => col.id === cell.columnId)?.name || '',
                    type: columns.find(col => col.id === cell.columnId)?.type || '',
                    value: cell.value
                }))
            }));

        setClipboard({ rows: copiedRows, sourceGridId: grid.id });

        const csvHeader = columns.map(col => col.name).join(',');
        const csvTypes = columns.map(col => col.type).join(',');

        const csvBody = copiedRows.map(row =>
            columns.map(col => {
                const cell = row.cells.find(c => c.columnName === col.name);
                let val = cell?.value || '';
                const needsQuoting = /[",\n]/.test(val);
                if (needsQuoting) {
                    val = `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            }).join(',')
        ).join('\n');

        const csvText = [csvHeader, csvTypes, csvBody].join('\n');

        navigator.clipboard.writeText(csvText)
            .then(() => toast.success("Скопировано как CSV с типами"))
            .catch(() => toast.error("Ошибка при копировании в буфер"));
    };

    const handlePasteCopied = async (targetGrid) => {
        let csvText = "";
        try {
            csvText = await navigator.clipboard.readText();
        } catch (err) {
            toast.error("Не удалось прочитать из буфера обмена");
            return;
        }

        let lines = csvText.trim().split("\n");
        if (lines.length < 2) {
            toast.error("CSV-данные неполные");
            return;
        }

        const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h =>
            h.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"')
        );

        let types = [];
        const possibleTypes = ["String", "Numeric", "Email", "RegExp", "External", "SingleSelect", "MultiSelect"];
        const secondLine = lines[1].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h =>
            h.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '')
        );

        const isTypeLine = secondLine.length === headers.length && secondLine.every(t => possibleTypes.includes(t));
        if (isTypeLine) {
            types = secondLine;
            lines = [lines[0], ...lines.slice(2)];
        }

        let updatedGrid = { ...targetGrid };
        let columnMap = {};

        if (!targetGrid.columns || targetGrid.columns.length === 0) {
            const newColumns = headers.map((name, index) => ({
                name,
                type: types[index] || "String",
                validationRegex: "",
                options: ""
            }));

            updatedGrid = {
                ...targetGrid,
                columns: newColumns,
            };

            try {
                const response = await api.put(`datagrid/${targetGrid.id}`, updatedGrid);
                updatedGrid = response.data;
            } catch (err) {
                console.error("Ошибка при создании колонок:", err);
                toast.error("Ошибка при создании колонок");
                return;
            }
        }

        headers.forEach((colName, index) => {
            const col = updatedGrid.columns.find(c => c.name === colName);
            if (col) columnMap[index] = col.id;
        });

        const unmapped = headers.filter((colName, idx) => columnMap[idx] === undefined);
        if (unmapped.length > 0) {
            toast.error(`Следующие колонки не найдены: ${unmapped.join(", ")}`);
            return;
        }

        const rowsToInsert = lines.slice(1) 
            .map(line => {
                const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v =>
                    v.replace(/^"(.*)"$/, '$1').replace(/""/g, '"').trim()
                );
                return {
                    cells: values.map((val, idx) => ({
                        columnId: columnMap[idx],
                        value: val
                    }))
                };
            })
            .filter(row =>
                row.cells.some(cell => cell.value && cell.value.trim() !== "")
            );

        if (rowsToInsert.length === 0) {
            toast.error("Нет данных для вставки");
            return;
        }

        const pluralize = (count, one, few, many) => {
            const mod10 = count % 10;
            const mod100 = count % 100;

            if (mod10 === 1 && mod100 !== 11) return one;
            if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
            return many;
        };

        try {
            await api.post('datagrid/batch-insert', {
                DataGridId: updatedGrid.id,
                Rows: rowsToInsert
            });

            await navigator.clipboard.writeText("");
            setSelectedRows(prev => ({ ...prev, [updatedGrid.id]: [] }));

            const count = rowsToInsert.length;
            const word = pluralize(count, 'строка', 'строки', 'строк');
            toast.success(`Вставлена ${count} ${word}`);

            fetchDataGrids();
        } catch (err) {
            console.error("Ошибка вставки строк:", err);
            toast.error("Ошибка при вставке строк");
        }
    };


    const renderGridCard = (grid, columnWidth) => {
        const { canEdit } = getGridPermissions(grid);
        return (
            <Card
                key={grid.id}
                variant="outlined"
                sx={{ mb: 2, p: 1 }}
                onMouseEnter={() => {
                    setCurrentGridId(grid.id);
                    setSelectedRows(prev => {
                        const cleared = { ...prev };
                        Object.keys(cleared).forEach(key => {
                            if (parseInt(key) !== grid.id) {
                                cleared[key] = [];
                            }
                        });
                        return cleared;
                    });
                }}
            >
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="h6">{grid.name}</Typography>
                        <Box>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleAddRecord(grid)}
                                sx={{ mr: 1 }}
                            >
                                Добавить запись
                            </Button>
                            {canEdit ? (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => handleOpenEdit(grid)}
                                    sx={{ mr: 1 }}
                                >
                                    Редактировать
                                </Button>
                            ) : (
                                <Button variant="outlined" size="small" disabled sx={{ mr: 1 }}>
                                    Только просмотр
                                </Button>
                            )}
                            {isAdmin && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => handleOpenPermissionDialog(grid)}
                                    sx={{ mr: 1 }}
                                >
                                    Управление правами
                                </Button>
                            )}
                            <IconButton
                                data-testid="delete-grid-button"
                                aria-label="delete-grid"
                                onClick={() => handleDeleteGrid(grid.id)}
                            >
                                <DeleteIcon color="error" />
                            </IconButton>
                        </Box>
                    </Box>
                    <Box sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Tooltip title={canEdit ? "Удалить выбранные строки" : "Нет прав на пакетное удаление"}>
                            <span>
                                <IconButton
                                    color="secondary"
                                    onClick={() => handleBatchDelete(grid.id)}
                                    disabled={!canEdit}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title={canEdit ? "Копировать выбранные строки" : "Нет прав на копирование"}>
                            <span>
                                <IconButton
                                    data-testid="copy-button"
                                    color="primary"
                                    onClick={() => handleCopySelected(grid)}
                                    disabled={!canEdit}
                                >
                                    <FileCopyIcon />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title={canEdit ? "Вставить скопированные строки" : "Нет прав на пакетное вставление"}>
                            <span>
                                <IconButton
                                    data-testid="paste-button"
                                    color="success"
                                    onClick={() => handlePasteCopied(grid)}
                                    disabled={!canEdit}
                                >
                                    <ContentPasteIcon />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Импорт из Excel">
                            <span>
                                <IconButton
                                    color="secondary"
                                    component="label"
                                    sx={{ mr: 1 }}
                                    disabled={!canEdit}
                                >
                                    <UploadFileIcon />
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        hidden
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;

                                            try {
                                                const data = await file.arrayBuffer();
                                                const workbook = XLSX.read(data);
                                                const firstSheetName = workbook.SheetNames[0];
                                                const worksheet = workbook.Sheets[firstSheetName];
                                                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });


                                                handleImportExcel(grid, jsonData);
                                            } catch (error) {
                                                toast.error("Ошибка при чтении Excel файла");
                                                console.error(error);
                                            } finally {
                                                e.target.value = null; 
                                            }
                                        }}
                                    />
                                </IconButton>
                            </span>
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
                                        <th style={{ border: '1px solid #ccc', padding: '4px', width: '40px', textAlign: 'center' }}>
                                            <Checkbox
                                                size="small"
                                                checked={
                                                    grid.rows.length > 0 &&
                                                    selectedRows[grid.id]?.length === grid.rows.length
                                                }
                                                indeterminate={
                                                    selectedRows[grid.id]?.length > 0 &&
                                                    selectedRows[grid.id]?.length < grid.rows.length
                                                }
                                                onChange={(e) => {
                                                    const allIds = grid.rows.map(r => r.id);
                                                    setSelectedRows(prev => ({
                                                        ...prev,
                                                        [grid.id]: e.target.checked ? allIds : []
                                                    }));
                                                }}
                                            />
                                        </th>
                                        {grid.columns.map(col => (
                                            <th key={col.id} style={{ border: '1px solid #ccc', padding: '4px', minWidth: columnWidth }}>
                                                <Typography variant="subtitle2">{col.name}</Typography>
                                                {(col.type === "SingleSelect" || col.type === "MultiSelect") && (
                                                    <Typography variant="caption">Варианты: {col.options}</Typography>
                                                )}
                                                {col.type === "String" && col.maxLength && (
                                                    <Typography variant="caption">Макс. символов: {col.maxLength}</Typography>
                                                )}
                                                {col.type === "Numeric" && (col.minValue || col.maxValue) && (
                                                    <Typography variant="caption">
                                                        {col.minValue != null && `Мин: ${col.minValue}`} {col.maxValue != null && `Макс: ${col.maxValue}`}
                                                    </Typography>
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
                                                        data-testid={`row-checkbox-${row.id}`}
                                                        aria-label={`checkbox for row ${row.id}`}
                                                        checked={selectedRows[grid.id]?.includes(row.id) || false}
                                                        onChange={(e) => handleRowSelection(grid.id, row.id, e.target.checked, e.nativeEvent)}
                                                    />
                                                </td>
                                                {grid.columns.map(col => {
                                                    const cell = (row.cells || []).find(c => Number(c.columnId) === Number(col.id)) || { value: "" };
                                                    let cellControl = null;
                                                    const isDisplayOnly = !!col.sourceGridId; const parsed = (() => {
                                                        try {
                                                            return JSON.parse(cell.value);
                                                        } catch {
                                                            return null;
                                                        }
                                                    })();

                                                    if (col.type === "External") {
                                                        cellControl = (
                                                            <ExternalCell
                                                                cell={cell}
                                                                column={col}
                                                                currentGridId={grid.id}
                                                                currentRowId={row.id}
                                                                rowsCache={
                                                                    dataGrids.find(g => g.id === col.linkedGridId)?.rows || []
                                                                }
                                                                onUpdate={(newValue) => {
                                                                    try {
                                                                        const parsed = typeof newValue === "string" ? JSON.parse(newValue) : newValue;
                                                                        const display = Array.isArray(parsed)
                                                                            ? parsed.map(p => p.display || p.rowId).join(', ')
                                                                            : parsed.display || parsed.rowId || "";

                                                                        handleCellChangeImmediate(grid.id, row.id, col.id, newValue);

                                                                        if (col.sourceGridId && col.sourceColumnId) {
                                                                            handleCellChangeImmediate(grid.id, row.id, col.sourceColumnId, display);
                                                                        }
                                                                    } catch (e) {
                                                                        console.error("Ошибка обработки onUpdate:", e);
                                                                    }
                                                                }}
                                                                onRefresh={gridId => fetchSingleGrid(gridId)}
                                                                canEdit={getGridPermissions(grid).canEdit}
                                                            />
                                                        );
                                                    } else if (col.type === "ReverseExternal") {
                                                        const targetGrid = dataGrids.find(g => g.id === col.sourceGridId);
                                                        const displayCol = targetGrid.columns.find(c => c.type === "String");
                                                        const editableCol = {
                                                            ...col,
                                                            type: "External",
                                                            linkedGridId: col.sourceGridId,
                                                            linkedColumnId: displayCol.id,   
                                                        };

                                                        cellControl = (
                                                            <ExternalCell
                                                                cell={cell}
                                                                column={editableCol}
                                                                currentGridId={grid.id}
                                                                currentRowId={row.id}
                                                                rowsCache={
                                                                    dataGrids.find(g => g.id === col.linkedGridId)?.rows || []
                                                                }
                                                                onUpdate={(newValue) => {
                                                                    try {
                                                                        handleCellChangeImmediate(grid.id, row.id, col.id, newValue);
                                                                    } catch (e) {
                                                                        console.error("Ошибка в onUpdate ReverseExternal:", e);
                                                                    }
                                                                }}
                                                                onRefresh={gridId => fetchSingleGrid(gridId)}
                                                                canEdit={getGridPermissions(grid).canEdit}
                                                            />
                                                        );
                                                    }
                                                     else if (col.type === "SingleSelect") {
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
                                                            editingCell.columnId === col.id &&
                                                            !isDisplayOnly
                                                        ) {
                                                            if (col.type === "Numeric") {
                                                                let inputProps = {};
                                                                if (col.minValue != null) inputProps.min = col.minValue;
                                                                if (col.maxValue != null) inputProps.max = col.maxValue;
                                                                inputProps.step = (col.maxValue - col.minValue >= 100) ? 10 : 1;

                                                                cellControl = (
                                                                    <TextField
                                                                        type="number"
                                                                        value={editingValue}
                                                                        onChange={(e) => setEditingValue(e.target.value)}
                                                                        onBlur={() => {
                                                                            let num = parseFloat(editingValue);
                                                                            if (isNaN(num)) num = "";
                                                                            else {
                                                                                if (col.minValue != null && num < col.minValue) num = col.minValue;
                                                                                if (col.maxValue != null && num > col.maxValue) num = col.maxValue;
                                                                            }
                                                                            const newValue = num.toString();
                                                                            setEditingValue(newValue);
                                                                            handleCellBlur(grid.id, row.id, col.id, newValue);
                                                                        }}
                                                                        autoFocus
                                                                        variant="standard"
                                                                        fullWidth
                                                                        inputProps={inputProps}
                                                                    />
                                                                );
                                                            } else {
                                                                cellControl = (
                                                                    <TextField
                                                                        type="text"
                                                                        value={editingValue}
                                                                        onChange={(e) => setEditingValue(e.target.value)}
                                                                        onBlur={() => handleCellBlur(grid.id, row.id, col.id, editingValue)}
                                                                        autoFocus
                                                                        variant="standard"
                                                                        fullWidth
                                                                        inputProps={col.maxLength ? { maxLength: col.maxLength } : {}}
                                                                    />
                                                                );
                                                            }
                                                        } else {
                                                            if (col.sourceGridId && col.sourceColumnId) {
                                                                const externalLinkCell = (row.cells || []).find(c => {
                                                                    const sourceCol = grid.columns.find(colCandidate => colCandidate.id === c.columnId);
                                                                    return sourceCol?.type === "External" &&
                                                                        sourceCol.linkedGridId === col.sourceGridId &&
                                                                        sourceCol.linkedColumnId === col.sourceColumnId;
                                                                });

                                                                let display = "";
                                                                if (externalLinkCell?.value) {
                                                                    try {
                                                                        const parsed = JSON.parse(externalLinkCell.value);
                                                                        const links = Array.isArray(parsed) ? parsed : [parsed];

                                                                        const linkedGrid = dataGrids.find(g => g.id === col.sourceGridId);
                                                                        const values = links.map(link => {
                                                                            const linkedRow = linkedGrid?.rows.find(r => r.id === link?.rowId);
                                                                            const linkedCell = linkedRow?.cells.find(c => c.columnId === col.sourceColumnId);
                                                                            return linkedCell?.value || "";
                                                                        });

                                                                        display = values.join(", ");
                                                                    } catch {
                                                                        display = "(ошибка)";
                                                                    }
                                                                }


                                                                cellControl = (
                                                                    <Typography variant="body2" sx={{ minHeight: "24px" }}>
                                                                        {display || "\u00A0"}
                                                                    </Typography>
                                                                );
                                                            } else {
                                                                cellControl = (
                                                                    <Typography
                                                                        variant="body2"
                                                                        onDoubleClick={() => {
                                                                            if (!isDisplayOnly && getGridPermissions(grid).canEdit) {
                                                                                handleCellClick(grid.id, row.id, col.id, cell.value);
                                                                            }
                                                                        }}
                                                                        style={{
                                                                            cursor: !isDisplayOnly && getGridPermissions(grid).canEdit ? "pointer" : "default",
                                                                            whiteSpace: "pre-wrap",
                                                                            minHeight: "24px"
                                                                        }}
                                                                    >
                                                                        {parsed?.display || parsed?.rowId || cell.value || "\u00A0"}
                                                                    </Typography>
                                                                );
                                                            }
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
                            <Tooltip title={!isAdmin ? "Только администратор может создавать таблицы" : ""}>
                                <span>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<AddIcon />}
                                        onClick={handleOpenCreate}
                                        fullWidth
                                        disabled={!isAdmin}
                                    >
                                        Создать
                                    </Button>
                                </span>
                            </Tooltip>
                        </Box>
                        <Divider />
                        {loading ? (
                            <Typography sx={{ mt: 2, p: 1 }}>Загрузка...</Typography>
                        ) : (
                            <List>
                                {dataGrids.map(grid => (
                                    <ListItem disablePadding key={grid.id}>
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
                        <Box
                            key={index}
                            sx={{
                                mb: 1,
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 1,
                                alignItems: 'center',
                                border: '1px solid #ccc',
                                padding: '8px',
                                borderRadius: '4px',
                            }}
                        >
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
                                    },
                                }}
                            >
                                {columnTypeOptions.map((option) => (
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
                                        },
                                    }}
                                />
                            )}
                            {col.type === 'String' && (
                                <TextField
                                    label="Макс. кол-во символов"
                                    type="number"
                                    value={col.maxLength ?? ''}
                                    onChange={(e) => handleCreateColumnChange(index, 'maxLength', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            )}
                            {col.type === 'Numeric' && (
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <TextField
                                        label="Мин. значение"
                                        type="number"
                                        value={col.minValue ?? ''}
                                        onChange={(e) => handleCreateColumnChange(index, 'minValue', e.target.value)}
                                        variant="outlined"
                                        size="small"
                                    />
                                    <TextField
                                        label="Макс. значение"
                                        type="number"
                                        value={col.maxValue ?? ''}
                                        onChange={(e) => handleCreateColumnChange(index, 'maxValue', e.target.value)}
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                            )}
                            {col.type === 'External' && (
                                <>
                                    <TextField
                                        select
                                        label="Таблица для связи"
                                        value={col.linkedGridId || ''}
                                        onChange={(e) => handleCreateColumnChange(index, 'linkedGridId', parseInt(e.target.value))}
                                        variant="outlined"
                                        size="small"
                                        sx={{
                                            minWidth: 200,
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: 'rgb(48, 48, 48)',
                                                color: 'white',
                                            },
                                        }}
                                    >
                                        {dataGrids.map(grid => (
                                            <MenuItem key={grid.id} value={grid.id}>{grid.name}</MenuItem>
                                        ))}
                                    </TextField>

                                    {col.linkedGridId && (
                                        <TextField
                                            select
                                            label="Поле отображения"
                                            value={col.linkedColumnId || ''}
                                            onChange={(e) => handleCreateColumnChange(index, 'linkedColumnId', parseInt(e.target.value))}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 200,
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: 'rgb(48, 48, 48)',
                                                    color: 'white',
                                                },
                                            }}
                                        >
                                            {(dataGrids.find(g => g.id === col.linkedGridId)?.columns || []).map(colOption => (
                                                <MenuItem key={colOption.id} value={colOption.id}>{colOption.name}</MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                </>
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
                        Создать таблицу
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
                        <Box
                            key={index}
                            sx={{
                                mb: 1,
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 1,
                                alignItems: 'center',
                                border: '1px solid #ccc',
                                padding: '8px',
                                borderRadius: '4px',
                            }}
                        >
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
                                    },
                                }}
                            >
                                {columnTypeOptions.map((option) => (
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
                                        },
                                    }}
                                />
                            )}
                            {col.type === 'String' && (
                                <TextField
                                    label="Макс. кол-во символов"
                                    type="number"
                                    value={col.maxLength ?? ''}
                                    onChange={(e) => handleEditColumnChange(index, 'maxLength', e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                            )}
                            {col.type === 'Numeric' && (
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <TextField
                                        label="Мин. значение"
                                        type="number"
                                        value={col.minValue ?? ''}
                                        onChange={(e) => handleEditColumnChange(index, 'minValue', e.target.value)}
                                        variant="outlined"
                                        size="small"
                                    />
                                    <TextField
                                        label="Макс. значение"
                                        type="number"
                                        value={col.maxValue ?? ''}
                                        onChange={(e) => handleEditColumnChange(index, 'maxValue', e.target.value)}
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                            )}{col.type === 'External' && (
                                <>
                                    <TextField
                                        select
                                        label="Таблица для связи"
                                        value={col.linkedGridId || ''}
                                        onChange={(e) => handleEditColumnChange(index, 'linkedGridId', parseInt(e.target.value))}
                                        variant="outlined"
                                        size="small"
                                        sx={{
                                            minWidth: 200,
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: 'rgb(48, 48, 48)',
                                                color: 'white',
                                            },
                                        }}
                                    >
                                        {dataGrids.map(grid => (
                                            <MenuItem key={grid.id} value={grid.id}>{grid.name}</MenuItem>
                                        ))}
                                    </TextField>

                                    {col.linkedGridId && (
                                        <TextField
                                            select
                                            label="Поле отображения"
                                            value={col.linkedColumnId || ''}
                                            onChange={(e) => handleEditColumnChange(index, 'linkedColumnId', parseInt(e.target.value))}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 200,
                                                '& .MuiOutlinedInput-root': {
                                                    backgroundColor: 'rgb(48, 48, 48)',
                                                    color: 'white',
                                                },
                                            }}
                                        >
                                            {(dataGrids.find(g => g.id === col.linkedGridId)?.columns || []).map(colOption => (
                                                <MenuItem key={colOption.id} value={colOption.id}>{colOption.name}</MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                </>
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
            <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover theme="dark" limit={3} />
        </>
    );
}

export default Dashboard;