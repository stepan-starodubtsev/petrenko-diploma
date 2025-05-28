// src/pages/AddHostPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

// Значення для типів хостів (мають відповідати HostTypeEnum на бекенді)
const hostTypesForSelect = [
    { value: "mikrotik_snmp", label: "MikroTik (SNMP)" },
    { value: "windows_agent", label: "Windows Агент" },
    { value: "ubuntu_agent", label: "Ubuntu Агент" },
    // Додай інші типи, якщо вони є
];

const AddHostPage = observer(() => {
    const { hostStore } = useStores();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [ipAddress, setIpAddress] = useState('');
    const [hostType, setHostType] = useState(hostTypesForSelect[0]?.value || ''); // Перший тип за замовчуванням

    // SNMP spezifische Felder
    const [snmpCommunity, setSnmpCommunity] = useState('public');
    const [snmpPort, setSnmpPort] = useState(161);
    const [snmpVersion, setSnmpVersion] = useState('2c'); // '1', '2c'

    const [isMonitored, setIsMonitored] = useState(true);
    const [notes, setNotes] = useState('');

    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setIsLoading(true);

        if (!name || !ipAddress || !hostType) {
            setError("Ім'я, IP адреса та тип хоста є обов'язковими.");
            setIsLoading(false);
            return;
        }

        const hostData = {
            name,
            ip_address: ipAddress,
            host_type: hostType,
            is_monitored: isMonitored,
            notes: notes || null, // Надсилаємо null, якщо поле порожнє
        };

        if (hostType === "mikrotik_snmp") {
            if (!snmpCommunity) {
                setError("SNMP Community є обов'язковим для SNMP хостів.");
                setIsLoading(false);
                return;
            }
            hostData.snmp_community = snmpCommunity;
            hostData.snmp_port = parseInt(snmpPort, 10) || 161;
            hostData.snmp_version = snmpVersion;
        }
        // unique_agent_id не встановлюється тут, він для авто-реєстрації

        try {
            await hostStore.addHost(hostData);
            navigate('/hosts'); // Перенаправлення на список хостів після успішного додавання
        } catch (apiError) {
            setError(apiError.response?.data?.detail || apiError.message || "Не вдалося додати хост.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
                    Додати Новий Хост
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Grid container spacing={3}>
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
                                            {/* <MenuItem value={'3'}>v3 (потребує більше полів)</MenuItem> */}
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
                        <Grid item xs={12}>
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                color="primary"
                                disabled={isLoading}
                                sx={{ mt: 2, mb: 2, py: 1.5 }}
                            >
                                {isLoading ? <CircularProgress size={24} color="inherit" /> : "Додати Хост"}
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </Container>
    );
});

export default AddHostPage;