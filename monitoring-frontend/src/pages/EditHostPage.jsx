// src/pages/EditHostPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStores } from '../stores';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';

// Значення для типів хостів (можна винести в константи, якщо використовуються в кількох місцях)
const hostTypesForSelect = [
    { value: "mikrotik_snmp", label: "MikroTik (SNMP)" },
    { value: "windows_agent", label: "Windows Агент" },
    { value: "ubuntu_agent", label: "Ubuntu Агент" },
];

const EditHostPage = observer(() => {
    const { hostId } = useParams();
    const { hostStore } = useStores();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [ipAddress, setIpAddress] = useState('');
    const [hostType, setHostType] = useState('');
    const [snmpCommunity, setSnmpCommunity] = useState('');
    const [snmpPort, setSnmpPort] = useState(161);
    const [snmpVersion, setSnmpVersion] = useState('2c');
    const [isMonitored, setIsMonitored] = useState(true);
    const [notes, setNotes] = useState('');
    const [uniqueAgentId, setUniqueAgentId] = useState(''); // Для відображення, не редагується

    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingHost, setIsFetchingHost] = useState(true);


    const populateForm = useCallback((host) => {
        if (host) {
            setName(host.name || '');
            setIpAddress(host.ip_address || '');
            setHostType(host.host_type || '');
            setSnmpCommunity(host.snmp_community || 'public');
            setSnmpPort(host.snmp_port || 161);
            setSnmpVersion(host.snmp_version || '2c');
            setIsMonitored(host.is_monitored !== undefined ? host.is_monitored : true);
            setNotes(host.notes || '');
            setUniqueAgentId(host.unique_agent_id || ''); // Зберігаємо для інформації
        }
    }, []);

    useEffect(() => {
        const loadHostData = async () => {
            if (hostId) {
                setIsFetchingHost(true);
                setError(null);
                // Спочатку перевіряємо, чи є дані в currentHost (можливо, після переходу зі списку)
                if (hostStore.currentHost && hostStore.currentHost.id === hostId) {
                    populateForm(hostStore.currentHost);
                    setIsFetchingHost(false);
                } else { // Якщо ні, завантажуємо
                    try {
                        // Використовуємо action зі стору, який також оновить currentHost
                        await hostStore.fetchHostById(hostId);
                        // hostStore.currentHost тепер має бути оновлений
                        if (hostStore.currentHost) {
                            populateForm(hostStore.currentHost);
                        } else {
                            setError(`Хост з ID ${hostId} не знайдено.`);
                        }
                    } catch (fetchError) {
                        setError(fetchError.response?.data?.detail || fetchError.message || "Не вдалося завантажити дані хоста.");
                    } finally {
                        setIsFetchingHost(false);
                    }
                }
            }
        };
        loadHostData();
    }, [hostId, hostStore, populateForm]); // Додав populateForm в залежності

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setIsLoading(true);

        if (!name.trim() || !ipAddress.trim() || !hostType) {
            setError("Ім'я, IP адреса та тип хоста є обов'язковими.");
            setIsLoading(false);
            return;
        }

        const hostUpdateData = {
            name: name.trim(),
            ip_address: ipAddress.trim(),
            host_type: hostType,
            is_monitored: isMonitored,
            notes: notes.trim() || null,
        };

        if (hostType === "mikrotik_snmp") {
            if (!snmpCommunity.trim()) {
                setError("SNMP Community є обов'язковим для SNMP хостів.");
                setIsLoading(false);
                return;
            }
            hostUpdateData.snmp_community = snmpCommunity.trim();
            hostUpdateData.snmp_port = parseInt(snmpPort, 10) || 161;
            hostUpdateData.snmp_version = snmpVersion;
        }
        // unique_agent_id зазвичай не редагується

        try {
            await hostStore.editHost(hostId, hostUpdateData);
            navigate(`/hosts/${hostId}`); // Повернення на сторінку деталей хоста
        } catch (apiError) {
            setError(apiError.response?.data?.detail || apiError.message || "Не вдалося оновити хост.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetchingHost) {
        return <Container sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Container>;
    }

    if (error && !hostStore.currentHost) { // Якщо помилка завадила завантажити хост
        return <Container><Alert severity="error" sx={{ mt: 2 }}>{error}</Alert></Container>;
    }

    // Ця перевірка потрібна, якщо помилка виникла не при завантаженні, а, наприклад, при сабміті
    // і хост був завантажений
    if (!hostStore.currentHost && !isFetchingHost) {
        return <Container><Alert severity="warning" sx={{ mt: 2 }}>Хост з ID {hostId} не знайдено.</Alert></Container>;
    }


    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
                    Редагувати Хост: {hostStore.currentHost?.name || name}
                </Typography>

                {/* Показуємо помилку відправки форми окремо від помилки завантаження */}
                {error && !isFetchingHost && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                label="Унікальний ID Агента (не редагується)"
                                fullWidth
                                value={uniqueAgentId || 'N/A (не агент)'}
                                disabled
                                variant="filled"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                id="name"
                                label="Ім'я Хоста"
                                name="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                id="ipAddress"
                                label="IP Адреса"
                                name="ipAddress"
                                value={ipAddress}
                                onChange={(e) => setIpAddress(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth required>
                                <InputLabel id="host-type-label">Тип Хоста</InputLabel>
                                <Select
                                    labelId="host-type-label"
                                    id="hostType"
                                    value={hostType}
                                    label="Тип Хоста"
                                    onChange={(e) => setHostType(e.target.value)}
                                >
                                    {hostTypesForSelect.map(option => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {hostType === 'mikrotik_snmp' && (
                            <>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        required
                                        fullWidth
                                        id="snmpCommunity"
                                        label="SNMP Community"
                                        value={snmpCommunity}
                                        onChange={(e) => setSnmpCommunity(e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        id="snmpPort"
                                        label="SNMP Порт"
                                        value={snmpPort}
                                        onChange={(e) => setSnmpPort(parseInt(e.target.value, 10) || '')}
                                        inputProps={{ min: 1, max: 65535 }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <FormControl fullWidth>
                                        <InputLabel id="snmp-version-label">SNMP Версія</InputLabel>
                                        <Select
                                            labelId="snmp-version-label"
                                            id="snmpVersion"
                                            value={snmpVersion}
                                            label="SNMP Версія"
                                            onChange={(e) => setSnmpVersion(e.target.value)}
                                        >
                                            <MenuItem value={'1'}>v1</MenuItem>
                                            <MenuItem value={'2c'}>v2c</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </>
                        )}

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                id="notes"
                                label="Нотатки (опціонально)"
                                name="notes"
                                multiline
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={isMonitored}
                                        onChange={(e) => setIsMonitored(e.target.checked)}
                                        name="isMonitored"
                                        color="primary"
                                    />
                                }
                                label="Моніторити цей хост"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                color="primary"
                                disabled={isLoading || isFetchingHost}
                                sx={{ py: 1.5 }}
                            >
                                {isLoading ? <CircularProgress size={24} color="inherit" /> : "Зберегти Зміни"}
                            </Button>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Button
                                fullWidth
                                variant="outlined"
                                color="secondary"
                                onClick={() => navigate(hostStore.currentHost ? `/hosts/${hostStore.currentHost.id}` : '/hosts')}
                                sx={{ py: 1.5 }}
                            >
                                Скасувати
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </Container>
    );
});

export default EditHostPage;