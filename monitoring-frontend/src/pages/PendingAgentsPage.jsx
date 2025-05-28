// src/pages/PendingAgentsPage.jsx
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
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString();
    } catch (e) {
        return dateString;
    }
};

const PendingAgentsPage = observer(() => {
    const { hostStore } = useStores();

    const [openApproveDialog, setOpenApproveDialog] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [hostNameForApproval, setHostNameForApproval] = useState('');
    const [ipAddressForApproval, setIpAddressForApproval] = useState('');
    const [dialogError, setDialogError] = useState('');
    const [isApproving, setIsApproving] = useState(false);

    useEffect(() => {
        hostStore.fetchPendingAgents();
    }, [hostStore]);

    const handleOpenApproveDialog = (agent) => {
        setSelectedAgent(agent);
        // Пропонуємо ім'я за замовчуванням, наприклад, на основі ID або типу
        setHostNameForApproval(agent.name || `agent-${agent.unique_agent_id.substring(0, 8)}`);
        setIpAddressForApproval(agent.ip_address || '');
        setDialogError('');
        setOpenApproveDialog(true);
    };

    const handleCloseApproveDialog = () => {
        setOpenApproveDialog(false);
        setSelectedAgent(null);
        setHostNameForApproval('');
        setIpAddressForApproval('');
        setDialogError('');
        setIsApproving(false);
    };

    const handleConfirmApprove = async () => {
        if (!selectedAgent || !hostNameForApproval.trim()) {
            setDialogError("Ім'я хоста є обов'язковим.");
            return;
        }
        setIsApproving(true);
        setDialogError('');

        const approvalData = {
            name: hostNameForApproval.trim(),
            ip_address: ipAddressForApproval.trim() || null, // надсилаємо null, якщо порожньо
        };

        try {
            await hostStore.approveAgent(selectedAgent.unique_agent_id, approvalData);
            // hostStore.approveAgent має оновити списки (pendingAgents та all hosts)
            handleCloseApproveDialog();
        } catch (error) {
            console.error("Error approving agent:", error);
            setDialogError(error.response?.data?.detail || error.message || "Не вдалося схвалити агента.");
            setIsApproving(false);
        }
    };


    if (hostStore.isLoadingPendingAgents) {
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (hostStore.errorPendingAgents) {
        return (
            <Container>
                <Alert severity="error" sx={{ mt: 2 }}>
                    Помилка завантаження агентів для схвалення: {hostStore.errorPendingAgents}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
                Агенти в очікуванні схвалення ({hostStore.pendingAgents.length})
            </Typography>

            {hostStore.pendingAgents.length === 0 ? (
                <Typography variant="subtitle1">Немає агентів для схвалення.</Typography>
            ) : (
                <TableContainer component={Paper} elevation={3}>
                    <Table sx={{ minWidth: 650 }} aria-label="pending agents table">
                        <TableHead sx={{ backgroundColor: (theme) => theme.palette.grey[200] }}>
                            <TableRow>
                                <TableCell>Унікальний ID Агента</TableCell>
                                <TableCell>IP Адреса (остання відома)</TableCell>
                                <TableCell>Тип Агента</TableCell>
                                <TableCell>Зареєстровано</TableCell>
                                <TableCell align="center">Дії</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {hostStore.pendingAgents.map((agent) => (
                                <TableRow
                                    key={agent.id}
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 },
                                        '&:hover': { backgroundColor: (theme) => theme.palette.action.hover }
                                    }}
                                >
                                    <TableCell component="th" scope="row">
                                        {agent.unique_agent_id}
                                    </TableCell>
                                    <TableCell>{agent.ip_address || 'N/A'}</TableCell>
                                    <TableCell>{agent.host_type || 'N/A'}</TableCell>
                                    <TableCell>{formatDate(agent.created_at)}</TableCell>
                                    <TableCell align="center">
                                        <Button
                                            variant="contained"
                                            color="success"
                                            size="small"
                                            startIcon={<CheckCircleOutlineIcon />}
                                            onClick={() => handleOpenApproveDialog(agent)}
                                        >
                                            Схвалити
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Діалогове вікно для схвалення агента */}
            {selectedAgent && (
                <Dialog open={openApproveDialog} onClose={handleCloseApproveDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>Схвалити Агента</DialogTitle>
                    <DialogContent>
                        <DialogContentText sx={{mb:2}}>
                            Агент ID: {selectedAgent.unique_agent_id}
                            <br/>
                            Тип: {selectedAgent.host_type || 'Не визначено'}
                        </DialogContentText>
                        {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
                        <TextField
                            autoFocus
                            margin="dense"
                            id="hostName"
                            label="Ім'я Хоста (обов'язково)"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={hostNameForApproval}
                            onChange={(e) => setHostNameForApproval(e.target.value)}
                            error={!hostNameForApproval.trim() && dialogError /* Показувати помилку, якщо поле порожнє при спробі зберегти */}
                            helperText={!hostNameForApproval.trim() && dialogError ? "Ім'я хоста не може бути порожнім" : ""}
                        />
                        <TextField
                            margin="dense"
                            id="ipAddress"
                            label="IP Адреса (опціонально, якщо потрібно оновити)"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={ipAddressForApproval}
                            onChange={(e) => setIpAddressForApproval(e.target.value)}
                            sx={{mt: 2}}
                        />
                    </DialogContent>
                    <DialogActions sx={{pb:2, pr:2}}>
                        <Button onClick={handleCloseApproveDialog} color="secondary">Скасувати</Button>
                        <Button
                            onClick={handleConfirmApprove}
                            variant="contained"
                            color="primary"
                            disabled={isApproving}
                        >
                            {isApproving ? <CircularProgress size={20} color="inherit" /> : "Схвалити"}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Container>
    );
});

export default PendingAgentsPage;