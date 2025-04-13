import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Checkbox,
    FormControlLabel,
    Box,
    Typography,
} from '@mui/material';
import api from '../services/axiosInstance';

const PermissionDialog = ({ open, onClose, dataGridId, onPermissionsUpdated = () => { } }) => {
    const [formPermissions, setFormPermissions] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        if (open) {
            const fetchPermissions = async () => {
                try {
                    const gridResponse = await api.get(`datagrid/${dataGridId}?t=${new Date().getTime()}`);
                    console.log("Получена таблица:", gridResponse.data);
                    const gridPermissions = gridResponse.data.permissions || [];

                    const usersResponse = await api.get(`users?t=${new Date().getTime()}`);
                    const usersData = usersResponse.data;
                    setUsers(usersData);

                    const combinedPermissions = usersData.map((user) => {
                        const uid = user.id.toLowerCase();
                        const perm = gridPermissions.find(p => {
                            const pid = (p.UserId || p.userId);
                            return pid && pid.toLowerCase() === uid;
                        });
                        console.log(`Права для пользователя ${user.id}:`, perm);
                        return {
                            userId: user.id,
                            CanView: perm ? (perm.CanView !== undefined ? perm.CanView : perm.canView) : false,
                            CanEdit: perm ? (perm.CanEdit !== undefined ? perm.CanEdit : perm.canEdit) : false,
                            CanDelete: perm ? (perm.CanDelete !== undefined ? perm.CanDelete : perm.canDelete) : false,
                        };
                    });
                    console.log("Сформированные разрешения:", combinedPermissions);
                    setFormPermissions(combinedPermissions);
                } catch (err) {
                    console.error("Ошибка при загрузке данных для разрешений:", err);
                }
            };
            fetchPermissions();
        } else {
            setFormPermissions([]);
            setUsers([]);
        }
    }, [open, dataGridId]);

    const handlePermissionChange = (userId, field, value) => {
        setFormPermissions((prev) =>
            prev.map((perm) =>
                perm.userId === userId ? { ...perm, [field]: value } : perm
            )
        );
    };

    const handleSave = async () => {
        try {
            const transformedPermissions = formPermissions.map((perm) => ({
                UserId: perm.userId,
                CanView: perm.CanView,
                CanEdit: perm.CanEdit,
                CanDelete: perm.CanDelete,
            }));
            const payload = {
                DataGridId: dataGridId,
                Permissions: transformedPermissions,
            };
            console.log("Отправляем payload:", payload);
            await api.put(`datagrid/${dataGridId}/permissions`, payload);
            onPermissionsUpdated();
            onClose();
        } catch (err) {
            console.error("Ошибка при сохранении разрешений:", err);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ backgroundColor: 'rgb(33, 33, 33)', color: 'white' }}>
                Управление правами доступа
            </DialogTitle>
            <DialogContent sx={{ backgroundColor: 'rgb(33, 33, 33)', color: 'white' }}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    Выберите пользователей и установите для них права доступа:
                </Typography>
                {users.map((user) => {
                    const perm =
                        formPermissions.find((p) => p.userId === user.id) || {
                            CanView: false,
                            CanEdit: false,
                            CanDelete: false,
                        };
                    return (
                        <Box key={user.id} sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 2 }}>
                            <Typography variant="subtitle1" sx={{ minWidth: '200px', color: 'white' }}>
                                {user.UserName || user.userName || user.username}
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={perm.CanView}
                                        onChange={(e) =>
                                            handlePermissionChange(user.id, 'CanView', e.target.checked)
                                        }
                                        sx={{ color: 'white' }}
                                    />
                                }
                                label="Просмотр"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={perm.CanEdit}
                                        onChange={(e) =>
                                            handlePermissionChange(user.id, 'CanEdit', e.target.checked)
                                        }
                                        sx={{ color: 'white' }}
                                    />
                                }
                                label="Редактирование"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={perm.CanDelete}
                                        onChange={(e) =>
                                            handlePermissionChange(user.id, 'CanDelete', e.target.checked)
                                        }
                                        sx={{ color: 'white' }}
                                    />
                                }
                                label="Удаление"
                            />
                        </Box>
                    );
                })}
            </DialogContent>
            <DialogActions sx={{ backgroundColor: 'rgb(33, 33, 33)' }}>
                <Button onClick={onClose} color="secondary">
                    Отмена
                </Button>
                <Button onClick={handleSave} color="primary">
                    Сохранить
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PermissionDialog;