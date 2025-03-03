import React from 'react';
import { Button, Grid, Typography } from '@mui/material';

function AdminPanel() {
    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <Typography variant="h4">Админ-панель</Typography>
            </Grid>
            <Grid item xs={12}>
                <Button variant="contained" color="primary">
                    Добавить новый DataGrid
                </Button>
            </Grid>

        </Grid>
    );
}

export default AdminPanel;
