// src/pages/ProblemsPage.jsx
import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Link as RouterLink } from 'react-router-dom';
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
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link'; // MUI Link для використання з RouterLink
import Tooltip from '@mui/material/Tooltip';
import ReportProblemIcon from '@mui/icons-material/ReportProblem'; // Іконка для заголовку

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString();
    } catch (e) {
        return dateString;
    }
};

const ProblemsPage = observer(() => {
    const { triggerStore, hostStore } = useStores();

    useEffect(() => {
        triggerStore.fetchActiveProblems();
        // Завантажуємо список хостів, якщо він ще не завантажений,
        // щоб мати можливість показувати імена хостів
        if (hostStore.hosts.length === 0) {
            hostStore.fetchHosts();
        }
    }, [triggerStore, hostStore]);

    const getHostNameById = (hostId) => {
        const host = hostStore.hosts.find(h => h.id === hostId);
        return host ? host.name : hostId; // Повертаємо ID, якщо ім'я не знайдено
    };

    // Визначаємо колір для Chip на основі серйозності
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'disaster':
            case 'high':
                return 'error';
            case 'average':
                return 'warning';
            case 'warning': // Якщо є окремий warning
                return 'warning';
            case 'information':
                return 'info';
            case 'not_classified':
            default:
                return 'default';
        }
    };


    if (triggerStore.isLoadingProblems || hostStore.isLoadingHosts) {
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (triggerStore.errorProblems) {
        return (
            <Container>
                <Alert severity="error" sx={{ mt: 2 }}>
                    Помилка завантаження активних проблем: {triggerStore.errorProblems}
                </Alert>
            </Container>
        );
    }
    if (hostStore.errorHosts && hostStore.hosts.length === 0) { // Якщо помилка завантаження хостів критична для відображення
        return (
            <Container>
                <Alert severity="warning" sx={{ mt: 2 }}>
                    Помилка завантаження списку хостів, імена хостів можуть бути не відображені: {hostStore.errorHosts}
                </Alert>
            </Container>
        );
    }


    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <ReportProblemIcon color="error" sx={{ fontSize: 40, mr: 1 }} />
                <Typography variant="h4" component="h1">
                    Активні Проблеми ({triggerStore.activeProblems.length})
                </Typography>
            </Box>

            {triggerStore.activeProblems.length === 0 ? (
                <Typography variant="subtitle1">Активних проблем не знайдено. Система працює стабільно!</Typography>
            ) : (
                <TableContainer component={Paper} elevation={3}>
                    <Table sx={{ minWidth: 650 }} aria-label="active problems table">
                        <TableHead sx={{ backgroundColor: (theme) => theme.palette.grey[200] }}>
                            <TableRow>
                                <TableCell>Час виникнення</TableCell>
                                <TableCell>Хост</TableCell>
                                <TableCell>Проблема (Тригер)</TableCell>
                                <TableCell>Серйозність</TableCell>
                                <TableCell>Поточне значення</TableCell>
                                <TableCell>Поріг</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {triggerStore.activeProblems.map((problem) => (
                                <TableRow
                                    key={problem.id}
                                    sx={{
                                        '&:last-child td, &:last-child th': { border: 0 },
                                        '&:hover': { backgroundColor: (theme) => theme.palette.action.hover },
                                        backgroundColor: problem.severity_override === 'disaster' || problem.severity_override === 'high'
                                            ? (theme) => theme.palette.error.light // Легке підсвічування для критичних
                                            : problem.severity_override === 'average' || problem.severity_override === 'warning'
                                                ? (theme) => theme.palette.warning.light // Легке підсвічування для попереджень
                                                : 'inherit'
                                    }}
                                >
                                    <TableCell>
                                        <Tooltip title={formatDate(problem.problem_started_at) || 'N/A'}>
                                            <span>{formatDate(problem.problem_started_at)}</span>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <Link component={RouterLink} to={`/hosts/${problem.host_id}`} underline="hover">
                                            {getHostNameById(problem.host_id)}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{problem.name_override || problem.internal_trigger_key}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={problem.severity_override || 'N/A'}
                                            color={getSeverityColor(problem.severity_override)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{problem.current_metric_value_snapshot || 'N/A'}</TableCell>
                                    <TableCell>{problem.user_threshold_value}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Container>
    );
});

export default ProblemsPage;