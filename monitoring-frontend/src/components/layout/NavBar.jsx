// src/components/layout/NavBar.jsx
import React, {useContext} from 'react';
import {NavLink, Link as RouterLink, useNavigate} from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container'; // Додано Container для обмеження ширини
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart'; // Приклад іконки для лого
import DashboardIcon from '@mui/icons-material/Dashboard'; // Іконка для дашборду
import DnsRoundedIcon from '@mui/icons-material/DnsRounded'; // Іконка для хостів
import PendingActionsIcon from '@mui/icons-material/PendingActions'; // Іконка для агентів в очікуванні
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import authStore from "../../stores/authStore.js";
import {useStores} from "../../stores/index.js"; // Іконка для проблем

const navItems = [
    {label: 'Дашборд', path: '/dashboard', icon: <DashboardIcon sx={{mr: 0.7, fontSize: '1.1rem'}}/>},
    {label: 'Хости', path: '/hosts', icon: <DnsRoundedIcon sx={{mr: 0.7, fontSize: '1.1rem'}}/>},
    {
        label: 'Агенти в Очікуванні',
        path: '/agents/pending',
        icon: <PendingActionsIcon sx={{mr: 0.7, fontSize: '1.1rem'}}/>
    },
    {
        label: 'Активні Проблеми',
        path: '/problems',
        icon: <ReportProblemOutlinedIcon sx={{mr: 0.7, fontSize: '1.1rem'}}/>
    },
];

function NavBar() {
    const navigate = useNavigate();
    const {authStore} = useStores();
    const handleLogout = () => {
        authStore.logout();
        navigate('/login');
    };
    return (
        <AppBar position="static" elevation={2} sx={{backgroundColor: (theme) => theme.palette.primary.main}}>
            <Container maxWidth="xl"> {/* Обмежуємо ширину для великих екранів */}
                <Toolbar disableGutters>
                    <MonitorHeartIcon
                        sx={{display: {xs: 'none', md: 'flex'}, mr: 1, color: 'white', fontSize: '2rem'}}/>
                    <Typography
                        variant="h6"
                        noWrap
                        component={RouterLink}
                        to="/dashboard"
                        sx={{
                            mr: 2,
                            display: {xs: 'none', md: 'flex'},
                            flexGrow: 0,
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            letterSpacing: '.1rem',
                            color: 'inherit',
                            textDecoration: 'none',
                            '&:hover': {
                                color: 'white',
                            }
                        }}
                    >
                        Моніторинг
                    </Typography>

                    {/* Мобільний вигляд: іконка та назва */}
                    <MonitorHeartIcon
                        sx={{display: {xs: 'flex', md: 'none'}, mr: 1, color: 'white', fontSize: '1.8rem'}}/>
                    <Typography
                        variant="h5"
                        noWrap
                        component={RouterLink}
                        to="/dashboard"
                        sx={{
                            mr: 2,
                            display: {xs: 'flex', md: 'none'},
                            flexGrow: 1,
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            letterSpacing: '.1rem',
                            color: 'inherit',
                            textDecoration: 'none',
                        }}
                    >
                        Монітор
                    </Typography>

                    {/* Навігаційні посилання для десктопу */}
                    <Box sx={{flexGrow: 1, display: {xs: 'none', md: 'flex'}}}>
                        {navItems.map((item) => (
                            <Button
                                key={item.label}
                                component={NavLink}
                                to={item.path}
                                // Використовуємо функцію для sx, щоб отримати доступ до isActive з NavLink
                                // Або можна покластися на клас .active, якщо налаштувати його глобально або через styled-components
                                sx={(isActive) => ({ // NavLink передає об'єкт { isActive, isPending }
                                    my: 2,
                                    mx: 0.5, // Зменшив горизонтальний відступ
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '6px 12px',
                                    textTransform: 'none', // Якщо не потрібні великі літери
                                    fontSize: '0.9rem',
                                    borderBottom: isActive ? '3px solid #fff' : '3px solid transparent', // Активне посилання
                                    borderRadius: 0, // Прибираємо заокруглення для ефекту вкладки
                                    transition: 'border-color 0.2s ease-in-out, background-color 0.2s ease-in-out',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                        borderBottomColor: isActive ? '#fff' : 'rgba(255, 255, 255, 0.5)'
                                    },
                                    // Якщо NavLink додає клас .active, можна використовувати його:
                                    // '&.active': {
                                    //    fontWeight: 'bold',
                                    //    borderBottom: '3px solid white',
                                    // }
                                })}
                            >
                                {item.icon}
                                {item.label}
                            </Button>
                        ))}
                    </Box>

                    <Box sx={{flexGrow: 0}}>
                        <Button color="inherit" onClick={handleLogout}>Logout</Button>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
}

export default NavBar;