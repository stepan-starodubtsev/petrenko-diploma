// src/pages/UsersManagementPage.jsx
import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../stores';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

import UserDialog from '../components/users/UserDialog'; // <--- Імпортуємо наш новий компонент

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
};

const UsersManagementPage = observer(() => {
    const { userStore, authStore } = useStores();

    // Стан для керування модальним вікном
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // null для створення, об'єкт для редагування
    const [dialogError, setDialogError] = useState('');
    const [isDialogLoading, setIsDialogLoading] = useState(false);

    useEffect(() => {
        userStore.fetchUsers();
    }, [userStore]);

    const handleCreateUser = () => {
        setEditingUser(null); // Режим створення
        setIsDialogOpen(true);
    };

    const handleEditUser = (user) => {
        setEditingUser(user); // Режим редагування
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingUser(null);
        setDialogError('');
        setIsDialogLoading(false);
    };

    const handleDialogSubmit = async (formData) => {
        setIsDialogLoading(true);
        setDialogError('');

        try {
            if (editingUser) { // Якщо це редагування
                // Пароль надсилаємо тільки якщо він був введений
                const updatePayload = { ...formData };
                if (!updatePayload.password) {
                    delete updatePayload.password;
                }
                await userStore.updateUser(editingUser.id, updatePayload);
            } else { // Якщо це створення
                await userStore.addUser(formData);
            }
            handleCloseDialog(); // Закриваємо вікно після успіху
        } catch (error) {
            setDialogError(error.response?.data?.detail || error.message || "Сталася помилка.");
        } finally {
            setIsDialogLoading(false);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (authStore.user?.username === username) {
            alert("Ви не можете видалити самі себе.");
            return;
        }
        if (window.confirm(`Ви впевнені, що хочете видалити користувача "${username}"?`)) {
            try {
                await userStore.removeUser(userId);
            } catch (error) {
                alert(`Помилка видалення: ${error.response?.data?.detail || error.message}`);
            }
        }
    };


    if (userStore.isLoading) {
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                <CircularProgress />
            </Container>
        );
    }

    if (userStore.error) {
        return <Container><Alert severity="error" sx={{ mt: 2 }}>{userStore.error}</Alert></Container>;
    }

    return (
        <>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AdminPanelSettingsIcon color="primary" sx={{ fontSize: 40, mr: 1 }} />
                        <Typography variant="h4" component="h1">
                            Управління Користувачами
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleCreateUser}
                    >
                        Створити Користувача
                    </Button>
                </Box>

                <TableContainer component={Paper} elevation={3}>
                    <Table>
                        <TableHead sx={{ backgroundColor: (theme) => theme.palette.grey[200] }}>
                            <TableRow>
                                <TableCell>Username</TableCell>
                                <TableCell>Повне ім'я</TableCell>
                                <TableCell>Роль</TableCell>
                                <TableCell>Статус</TableCell>
                                <TableCell>Створено</TableCell>
                                <TableCell align="center">Дії</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {userStore.users.map((user) => (
                                <TableRow key={user.id} hover>
                                    <TableCell sx={{fontWeight: 500}}>{user.username}</TableCell>
                                    <TableCell>{user.full_name || '—'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.role}
                                            color={user.role === 'admin' ? 'secondary' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.is_active ? 'Активний' : 'Неактивний'}
                                            color={user.is_active ? 'success' : 'error'}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>{formatDate(user.created_at)}</TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Редагувати">
                                            <IconButton onClick={() => handleEditUser(user)} color="primary">
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Видалити">
                                            <span>
                                                <IconButton
                                                    onClick={() => handleDeleteUser(user.id, user.username)}
                                                    color="error"
                                                    disabled={authStore.user?.username === user.username}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Container>

            {/* Модальне вікно для створення/редагування */}
            <UserDialog
                open={isDialogOpen}
                onClose={handleCloseDialog}
                onSubmit={handleDialogSubmit}
                user={editingUser}
                isLoading={isDialogLoading}
                error={dialogError}
            />
        </>
    );
});

export default UsersManagementPage;