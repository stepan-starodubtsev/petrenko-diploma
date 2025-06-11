import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';

const UserDialog = ({ open, onClose, onSubmit, user, isLoading, error }) => {
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        password: '',
        role: 'user',
        is_active: true,
    });

    const isEditMode = !!user; // Визначаємо режим: true для редагування, false для створення

    useEffect(() => {
        if (isEditMode) {
            // Заповнюємо форму даними існуючого користувача
            setFormData({
                username: user.username || '',
                full_name: user.full_name || '',
                password: '', // Пароль завжди порожній для редагування
                role: user.role || 'user',
                is_active: user.is_active !== undefined ? user.is_active : true,
            });
        } else {
            // Скидаємо до значень за замовчуванням для створення
            setFormData({
                username: '',
                full_name: '',
                password: '',
                role: 'user',
                is_active: true,
            });
        }
    }, [user, open]); // Оновлюємо форму, коли змінюється користувач або вікно відкривається

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleInternalSubmit = (event) => {
        event.preventDefault();
        // Передаємо дані форми батьківському компоненту
        onSubmit(formData);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{isEditMode ? 'Редагувати Користувача' : 'Створити Нового Користувача'}</DialogTitle>
            <Box component="form" onSubmit={handleInternalSubmit}>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField
                        autoFocus
                        required
                        margin="dense"
                        id="username"
                        name="username"
                        label="Ім'я користувача (username)"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={formData.username}
                        onChange={handleChange}
                        disabled={isEditMode} // Не можна змінювати username
                    />
                    <TextField
                        margin="dense"
                        id="full_name"
                        name="full_name"
                        label="Повне ім'я (опціонально)"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={formData.full_name}
                        onChange={handleChange}
                        sx={{ mt: 2 }}
                    />
                    <TextField
                        margin="dense"
                        required={!isEditMode} // Пароль обов'язковий тільки при створенні
                        fullWidth
                        id="password"
                        name="password"
                        label={isEditMode ? 'Новий пароль (залиште порожнім, щоб не змінювати)' : 'Пароль'}
                        type="password"
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleChange}
                        sx={{ mt: 2 }}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="role-select-label">Роль</InputLabel>
                        <Select
                            labelId="role-select-label"
                            id="role"
                            name="role"
                            value={formData.role}
                            label="Роль"
                            onChange={handleChange}
                        >
                            <MenuItem value={'user'}>User</MenuItem>
                            <MenuItem value={'admin'}>Admin</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px' }}>
                    <Button onClick={onClose} color="secondary">Скасувати</Button>
                    <Button type="submit" variant="contained" disabled={isLoading}>
                        {isLoading ? <CircularProgress size={24} /> : (isEditMode ? 'Зберегти Зміни' : 'Створити')}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
};

export default UserDialog;