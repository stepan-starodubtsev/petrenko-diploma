// src/pages/HostsListPage.jsx
import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../stores'; // Припускаємо, що useStores експортується з src/stores/index.js

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

// Іконки (опціонально, для кнопок дій)
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import {useNavigate} from "react-router-dom";

const HostsListPage = observer(() => {
    const { hostStore } = useStores();
    const navigate = useNavigate(); // Для навігації пізніше

    useEffect(() => {
        hostStore.fetchHosts();
    }, [hostStore]); // Залежність від hostStore, щоб запустити один раз або при зміні стору

    const handleAddHost = () => {
        console.log("Navigate to Add Host page");
        navigate('/hosts/new'); // Приклад навігації
    };

    const handleViewHost = (hostId) => {
        console.log(`Maps to Host Details page for ID: ${hostId}`);
        navigate(`/hosts/${hostId}`);
    };

    const handleEditHost = (hostId) => {
        console.log(`Maps to Edit Host page for ID: ${hostId}`);
        navigate(`/hosts/${hostId}/edit`);
    };

    const handleDeleteHost = async (hostId) => {
        if (window.confirm("Ви впевнені, що хочете видалити цей хост?")) {
            try {
                await hostStore.removeHost(hostId);
            } catch (error) {
                console.error("Error deleting host:", error);
            }
        }
    };


    if (hostStore.isLoadingHosts) {
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (hostStore.errorHosts) {
        return (
            <Container>
                <Alert severity="error" sx={{ mt: 2 }}>
                    Помилка завантаження хостів: {hostStore.errorHosts}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Список Хостів ({hostStore.hostCount})
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={handleAddHost}
                    // component={RouterLink} to="/hosts/new" // Для react-router
                >
                    Додати Хост
                </Button>
            </Box>

            {hostStore.hosts.length === 0 ? (
                <Typography variant="subtitle1">Хости не знайдено. Додайте перший хост.</Typography>
            ) : (
                <TableContainer component={Paper} elevation={3}>
                    <Table sx={{ minWidth: 650 }} aria-label="simple table">
                        <TableHead sx={{ backgroundColor: (theme) => theme.palette.grey[200] }}>
                            <TableRow>
                                <TableCell>Ім'я</TableCell>
                                <TableCell>IP Адреса</TableCell>
                                <TableCell>Тип</TableCell>
                                <TableCell>Статус Доступності</TableCell>
                                <TableCell align="center">Дії</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {hostStore.hosts.map((host) => (
                                <TableRow
                                    key={host.id}
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 },
                                        '&:hover': { backgroundColor: (theme) => theme.palette.action.hover }
                                    }}
                                >
                                    <TableCell component="th" scope="row">
                                        {host.name}
                                    </TableCell>
                                    <TableCell>{host.ip_address || '-'}</TableCell>
                                    <TableCell>{host.host_type || '-'}</TableCell>
                                    <TableCell>
                                        <Box
                                            component="span"
                                            sx={{
                                                p: '2px 8px',
                                                borderRadius: '12px',
                                                color: 'white',
                                                backgroundColor:
                                                    host.availability_status === 'up' ? 'success.main' :
                                                        host.availability_status === 'down' ? 'error.main' :
                                                            host.availability_status === 'pending_approval' ? 'warning.main' :
                                                                'grey.500'
                                            }}
                                        >
                                            {host.availability_status || 'unknown'}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Переглянути">
                                            <IconButton onClick={() => handleViewHost(host.id)} color="primary">
                                                <VisibilityIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Редагувати">
                                            <IconButton onClick={() => handleEditHost(host.id)} color="secondary">
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Видалити">
                                            <IconButton onClick={() => handleDeleteHost(host.id)} sx={{ color: (theme) => theme.palette.error.main }}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Container>
    );
});

export default HostsListPage;