import React, { useEffect, useState, useMemo } from 'react';
import { Box, Chip, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import api from '../services/axiosInstance';
import SelectRecordDialog from './SelectRecordDialog';
import { toast } from 'react-toastify';

function ExternalCell({
    cell,
    column,
    currentGridId,
    currentRowId,
    rowsCache = [],
    onUpdate,
    onRefresh,
    canEdit
}) {
    const [openDialog, setOpenDialog] = useState(false);
    const [items, setItems] = useState([]);

    const parsed = useMemo(() => {
        if (!cell?.value) return [];
        if (typeof cell.value === 'object') {
            return Array.isArray(cell.value) ? cell.value : [cell.value];
        }
        try {
            const result = JSON.parse(cell.value);
            return Array.isArray(result) ? result : [result];
        } catch {
            return [];
        }
    }, [cell?.value]);

    const linkedGridId = column?.linkedGridId;
    const linkedColumnId = column?.linkedColumnId;

    useEffect(() => {
        if (!linkedGridId || !linkedColumnId) {
            setItems([]);
            return;
        }

        const rows = rowsCache;
        if (!rows || rows.length === 0) {
            setItems(parsed.map(l => ({
                rowId: l.rowId,
                display: l.display || `(ID: ${l.rowId})`
            })));
            return;
        }

        if (column.type === 'ReverseExternal') {
            const matched = [];
            for (const r of rows) {
                const c = r.cells.find(c => c.columnId === linkedColumnId);
                if (!c?.value) continue;
                try {
                    const arr = Array.isArray(JSON.parse(c.value))
                        ? JSON.parse(c.value)
                        : [JSON.parse(c.value)];
                    const linkObj = arr.find(l => l.rowId === currentRowId);
                    if (linkObj) {
                        matched.push({
                            rowId: r.id,
                            display: linkObj.display || `(ID: ${r.id})`
                        });
                    }
                } catch {
                }
            }
            setItems(matched);
        } else {
            const enriched = parsed.map(link => {
                const targetRow = rows.find(r => r.id === link.rowId);
                const targetCell = targetRow
                    ?.cells.find(c => c.columnId === linkedColumnId);
                return {
                    rowId: link.rowId,
                    display:
                        targetCell?.value ||
                        link.display ||
                        `(ID: ${link.rowId})`
                };
            });
            setItems(enriched);
        }
    }, [
        rowsCache,
        parsed,
        column.type,
        currentRowId,
        linkedGridId,
        linkedColumnId
    ]);

    const handleSelect = async (record) => {
        if (linkedGridId === currentGridId && record.rowId === currentRowId) {
            toast.warning("Нельзя ссылаться на саму себя");
            return;
        }
        if (items.some(i => i.rowId === record.rowId)) {
            toast.info("Запись уже добавлена");
            return;
        }

        const newItems = [
            ...items,
            { rowId: record.rowId, display: record.display }
        ];
        const newValue = JSON.stringify(newItems);

        try {
            await api.post('/datagrid/update-cell', {
                gridId: currentGridId,
                rowId: currentRowId,
                columnId: column.id,
                value: newValue
            });
            setItems(newItems);
            onUpdate?.(newValue);
            onRefresh?.(linkedGridId);
            toast.success("Связь добавлена");
        } catch (err) {
            console.error("Ошибка при сохранении:", err);
            toast.error("Не удалось сохранить связь");
        } finally {
            setOpenDialog(false);
        }
    };

    const handleDelete = async (targetRowId) => {
        const newItems = items.filter(i => i.rowId !== targetRowId);
        const newValue = JSON.stringify(newItems);

        try {
            await api.post('/datagrid/update-cell', {
                gridId: currentGridId,
                rowId: currentRowId,
                columnId: column.id,
                value: newValue
            });
            setItems(newItems);
            onUpdate?.(newValue);
            onRefresh?.(linkedGridId);
            toast.success("Связь удалена");
        } catch (err) {
            console.error("Ошибка при удалении связи:", err);
            toast.error("Ошибка при удалении");
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '4px',
                minHeight: '24px'
            }}
        >
            {items.map(item => (
                <Chip
                    key={item.rowId}
                    label={item.display}
                    onDelete={
                        canEdit ? () => handleDelete(item.rowId) : undefined
                    }
                    size="small"
                    sx={{ maxWidth: '160px' }}
                />
            ))}

            {canEdit && (
                <IconButton
                    size="small"
                    onClick={() => setOpenDialog(true)}
                    sx={{ padding: '2px', color: 'primary.main' }}
                >
                    <AddIcon fontSize="small" />
                </IconButton>
            )}

            <SelectRecordDialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                onSelect={handleSelect}
                linkedGridId={linkedGridId}
                linkedColumnId={linkedColumnId}
            />
        </Box>
    );
}

export default ExternalCell;