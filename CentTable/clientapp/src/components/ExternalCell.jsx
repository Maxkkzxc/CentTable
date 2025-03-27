import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Typography } from '@mui/material';
import SelectRecordDialog from './SelectRecordDialog';
import api from '../services/axiosInstance';

function ExternalCell({ cell, onUpdate, currentGridId, currentRowId }) {
    const [openDialog, setOpenDialog] = useState(false);
    const [externalDisplay, setExternalDisplay] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    const parsedValue = useMemo(() => {
        if (!cell.value) return null;
        try {
            return JSON.parse(cell.value);
        } catch (e) {
            console.error("Ошибка парсинга внешней ссылки", e);
            return null;
        }
    }, [cell.value]);

    const lastValueRef = useRef(null);

    useEffect(() => {
        if (!parsedValue || !parsedValue.gridId || !parsedValue.rowId || !parsedValue.targetColumnId) return;
        let isMounted = true;

        const fetchData = async () => {
            try {
                const res = await api.get(`datagrid/${parsedValue.gridId}`);
                const grid = res.data;
                const row = grid.rows.find(r => Number(r.id) === Number(parsedValue.rowId));
                if (!row) {
                    if (isMounted) {
                        setErrorMsg('Строка не найдена');
                        setExternalDisplay('');
                    }
                    return;
                }
                const targetCell = row.cells.find(c => Number(c.columnId) === Number(parsedValue.targetColumnId));
                if (targetCell) {
                    if (isMounted && targetCell.value !== lastValueRef.current) {
                        lastValueRef.current = targetCell.value;
                        setExternalDisplay(targetCell.value);
                    }
                } else {
                    if (isMounted) setExternalDisplay('');
                }
            } catch (err) {
                console.error("ExternalCell: Ошибка получения данных", err);
                if (isMounted) setErrorMsg('Ошибка загрузки');
            } finally {
                if (isMounted && initialLoading) setInitialLoading(false);
            }
        };

        fetchData();
        const intervalId = setInterval(fetchData, 2000);
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [parsedValue, initialLoading]); 


    const handleSelectRecord = (item) => {
        if (Number(item.gridId) === Number(currentGridId) && Number(item.rowId) === Number(currentRowId)) {
            alert("Нельзя ссылаться на саму себя!");
            return;
        }
        const newValue = JSON.stringify({
            gridId: item.gridId,
            rowId: item.rowId,
            targetColumnId: item.targetColumnId
        });
        onUpdate(newValue);
    };

    return (
        <div>
            {parsedValue ? (
                initialLoading ? (
                    <Typography variant="body2">Загрузка...</Typography>
                ) : errorMsg ? (
                    <Typography
                        variant="body2"
                        color="error"
                        onDoubleClick={() => setOpenDialog(true)}
                        style={{ cursor: 'pointer' }}
                    >
                        {errorMsg}
                    </Typography>
                ) : (
                    <Typography
                        variant="body2"
                        onDoubleClick={() => setOpenDialog(true)}
                        style={{ cursor: 'pointer' }}
                    >
                        {externalDisplay || "Нет значения"}
                    </Typography>
                )
            ) : (
                <Button variant="outlined" size="small" onClick={() => setOpenDialog(true)}>
                    Выбрать запись
                </Button>
            )}
            <SelectRecordDialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                onSelect={handleSelectRecord}
                currentGridId={currentGridId}
                currentRowId={currentRowId}
                columnId={parsedValue ? parsedValue.targetColumnId : undefined}
            />
        </div>
    );
}

export default ExternalCell;
