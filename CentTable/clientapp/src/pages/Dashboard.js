import React, { useEffect, useState } from 'react';
import { Button, Grid, Typography } from '@mui/material';

function Dashboard() {
    const [data, setData] = useState([]);

    useEffect(() => {
        fetch('https://localhost:7261/api/data')  
            .then((response) => response.json())
            .then((data) => setData(data));
    }, []);

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <Typography variant="h4">Данные</Typography>
            </Grid>
            {data.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                    <Button variant="outlined">{item.name}</Button>
                </Grid>
            ))}
        </Grid>
    );
}

export default Dashboard;
