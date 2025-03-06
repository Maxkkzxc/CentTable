import React from "react";
import { Button, Typography, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { logout } from "../services/authService";

function Dashboard() {
    const navigate = useNavigate();

    const handleLogout = () => {
        logout(); 
        navigate("/login", { replace: true });
    };

    return (
        <Container>
            <Button
                variant="contained"
                color="secondary"
                onClick={handleLogout}
                style={{ marginTop: "20px" }}
            >
                Выйти
            </Button>
        </Container>
    );
}

export default Dashboard;
