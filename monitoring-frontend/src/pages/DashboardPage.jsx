// src/pages/DashboardPage.jsx
import React, {useEffect, useMemo, useState, useCallback} from 'react';
import {observer} from 'mobx-react-lite';
import {Link as RouterLink, useNavigate} from 'react-router-dom';
import {useStores} from '../stores';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link'; // MUI Link

import DnsIcon from '@mui/icons-material/Dns';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Legend, Pie, PieChart, Tooltip
} from 'recharts';
import LineChartCard from "../components/charts/LineChartCard.jsx"; // Переконайся, що шлях правильний
import {runInAction} from "mobx";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString();
    } catch (e) {
        // console.error("Error formatting date:", dateString, e); // Можна логувати, якщо потрібно
        return dateString;
    }
};

const StatCard = ({title, value, icon, color = "text.secondary", linkTo}) => {
    const navigate = useNavigate();
    return (
        // Виправлено: використовуємо xs, sm, md для Grid item
        <Grid item size={3}>
            <Paper
                elevation={3}
                sx={{
                    p: 2, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', height: 140,
                    cursor: linkTo ? 'pointer' : 'default',
                    '&:hover': linkTo ? {boxShadow: 6, transform: 'scale(1.02)'} : {},
                    transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out'
                }}
                onClick={linkTo ? () => navigate(linkTo) : undefined}
            >
                <Box sx={{fontSize: 36, color: color, mb: 1}}>{icon}</Box>
                <Typography color="text.secondary" gutterBottom align="center" sx={{fontSize: '0.9rem'}}>
                    {title}
                </Typography>
                <Typography variant="h4" component="div" sx={{color: color}}>
                    {value}
                </Typography>
            </Paper>
        </Grid>
    );
};

const COLORS_SEVERITY = {
    disaster: '#D32F2F', high: '#F44336', average: '#FF9800',
    warning: '#FFC107', information: '#2196F3', not_classified: '#9E9E9E',
    default: '#9E9E9E'
};
const COLORS_AVAILABILITY = {
    up: '#4CAF50', down: '#F44336', unknown: '#9E9E9E',
    pending_approval: '#FFC107' // Змінено для відповідності ключам
};

const CustomPieLabel = ({cx, cy, midAngle, innerRadius, outerRadius, percent, name, value, fill}) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const textAnchor = x > cx ? 'start' : 'end';

    return (
        <text x={x} y={y} fill={fill || "#333"} textAnchor={textAnchor} dominantBaseline="central" fontSize="12">
            {`${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
        </text>
    );
};


const DashboardPage = observer(() => {
    const {hostStore, triggerStore, metricStore} = useStores();
    const navigate = useNavigate();
    const [selectedHostIdForCharts, setSelectedHostIdForCharts] = useState('');

    const [cpuChartData, setCpuChartData] = useState({
        data: [],
        isLoading: false,
        error: null,
        hostName: null,
        metricName: "Завантаження CPU"
    });
    const [ramChartData, setRamChartData] = useState({
        data: [],
        isLoading: false,
        error: null,
        hostName: null,
        metricName: "Використання RAM (%)"
    });

    useEffect(() => {
        hostStore.fetchHosts();
        triggerStore.fetchActiveProblems();
        hostStore.fetchPendingAgents();
    }, [hostStore, triggerStore]);

    useEffect(() => {
        if (hostStore.hosts.length > 0 && !selectedHostIdForCharts) {
            setSelectedHostIdForCharts(hostStore.hosts[0].id);
        } else if (hostStore.hosts.length === 0 && selectedHostIdForCharts) {
            setSelectedHostIdForCharts('');
        }
    }, [hostStore.hosts, selectedHostIdForCharts]);

    // useEffect для завантаження даних для лінійних графіків
    useEffect(() => {
        const loadLineChartData = async () => {
            if (!selectedHostIdForCharts) { // Якщо жоден хост не вибрано
                setCpuChartData({
                    data: [],
                    isLoading: false,
                    error: "Будь ласка, виберіть хост для відображення графіків.",
                    hostName: null,
                    metricName: "Завантаження CPU"
                });
                setRamChartData({
                    data: [],
                    isLoading: false,
                    error: "Будь ласка, виберіть хост для відображення графіків.",
                    hostName: null,
                    metricName: "Використання RAM (%)"
                });
                return;
            }

            const chosenHost = hostStore.hosts.find(h => h.id === selectedHostIdForCharts);

            if (chosenHost) {
                const hostId = chosenHost.id;
                const hostName = chosenHost.name;
                const hostType = chosenHost.host_type;
                const endTime = new Date();
                const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // За останню годину

                // CPU Chart Data
                const cpuMetricKey = hostType === 'mikrotik_snmp' ? "mikrotik.system.cpu.load" : "system.cpu.utilization";
                setCpuChartData(prev => ({
                    ...prev,
                    isLoading: true,
                    hostName: hostName,
                    error: null,
                    metricName: `CPU (${hostName})`
                }));
                try {
                    await metricStore.fetchMetricHistory(hostId, cpuMetricKey, startTime.toISOString(), endTime.toISOString(), 60);
                    runInAction(() => { // Важливо для MobX, якщо fetchMetricHistory не робить це всередині
                        const data = metricStore.getMetrics(hostId, cpuMetricKey)
                            .map(m => ({timestamp: m.timestamp, value: m.value_numeric}))
                            .filter(m => m.value !== null && m.value !== undefined)
                            .slice().reverse();
                        setCpuChartData({
                            data,
                            isLoading: false,
                            error: null,
                            hostName: hostName,
                            metricName: `CPU (${hostName})`
                        });
                    });
                } catch (err) {
                    runInAction(() => setCpuChartData({
                        data: [],
                        isLoading: false,
                        error: err.message,
                        hostName: hostName,
                        metricName: `CPU (${hostName})`
                    }));
                }

                // RAM Chart Data
                const ramMetricKey = hostType === 'mikrotik_snmp' ? "mikrotik.system.memory.used" : "system.memory.used_percent";
                const ramMetricName = hostType === 'mikrotik_snmp' ? `RAM (${hostName}, байт)` : `RAM (${hostName}, %)`;
                setRamChartData(prev => ({
                    ...prev,
                    isLoading: true,
                    hostName: hostName,
                    metricName: ramMetricName,
                    error: null
                }));
                try {
                    await metricStore.fetchMetricHistory(hostId, ramMetricKey, startTime.toISOString(), endTime.toISOString(), 60);
                    runInAction(() => { // Важливо для MobX
                        const data = metricStore.getMetrics(hostId, ramMetricKey)
                            .map(m => ({timestamp: m.timestamp, value: m.value_numeric}))
                            .filter(m => m.value !== null && m.value !== undefined)
                            .slice().reverse();
                        setRamChartData({
                            data,
                            isLoading: false,
                            error: null,
                            hostName: hostName,
                            metricName: ramMetricName
                        });
                    });
                } catch (err) {
                    runInAction(() => setRamChartData({
                        data: [],
                        isLoading: false,
                        error: err.message,
                        hostName: hostName,
                        metricName: ramMetricName
                    }));
                }
            } else if (selectedHostIdForCharts) {
                setCpuChartData({
                    data: [],
                    isLoading: false,
                    error: `Хост з ID ${selectedHostIdForCharts} не знайдено.`,
                    hostName: null,
                    metricName: "Завантаження CPU"
                });
                setRamChartData({
                    data: [],
                    isLoading: false,
                    error: `Хост з ID ${selectedHostIdForCharts} не знайдено.`,
                    hostName: null,
                    metricName: "Використання RAM (%)"
                });
            }
        };

        // Запускаємо завантаження даних для графіків тільки після того, як основні дані сторів (хости) завантажені
        if (!hostStore.isLoadingHosts) {
            loadLineChartData();
        }
        // Залежимо від selectedHostIdForCharts та isLoadingHosts (щоб реагувати на завершення завантаження хостів)
    }, [selectedHostIdForCharts, hostStore.isLoadingHosts, hostStore.hosts, metricStore]);


    const hostStatusData = useMemo(() => {
        const counts = {up: 0, down: 0, unknown: 0, pending_approval: 0};
        if (!hostStore.hosts) return []; // Додаткова перевірка
        hostStore.hosts.forEach(host => {
            if (host && host.availability_status) { // Перевірка, що хост і статус існують
                counts[host.availability_status] = (counts[host.availability_status] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .map(([name, value]) => ({name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value}))
            .filter(entry => entry.value > 0);
    }, [hostStore.hosts]);

    const problemsBySeverityData = useMemo(() => {
        const counts = {};
        if (!triggerStore.activeProblems) return [];
        triggerStore.activeProblems.forEach(problem => {
            if (problem) { // Перевірка
                const severity = problem.severity_override || 'not_classified';
                counts[severity] = (counts[severity] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .map(([name, value]) => ({
                name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                value,
                fill: COLORS_SEVERITY[name] || COLORS_SEVERITY.default
            }))
            .sort((a, b) => b.value - a.value);
    }, [triggerStore.activeProblems]);

    const hostsWithProblemsCount = useMemo(() => {
        if (!triggerStore.activeProblems) return 0;
        const hostIdsWithProblems = new Set(triggerStore.activeProblems.map(p => p.host_id));
        return hostIdsWithProblems.size;
    }, [triggerStore.activeProblems]);

    const getHostNameById = useCallback((hostId) => {
        if (!hostStore.hosts) return hostId;
        const host = hostStore.hosts.find(h => h && h.id === hostId);
        return host ? host.name : hostId;
    }, [hostStore.hosts]);

    const getSeverityChipColor = (severity) => {
        switch (severity) {
            case 'disaster':
                return 'error';
            case 'high':
                return 'error';
            case 'average':
                return 'warning';
            case 'warning':
                return 'warning';
            case 'information':
                return 'info';
            default:
                return 'default';
        }
    };

    // Головний індикатор завантаження для всієї сторінки
    if (hostStore.isLoadingHosts || triggerStore.isLoadingProblems || hostStore.isLoadingPendingAgents) {
        // Цей індикатор буде показаний, поки завантажуються основні дані для карток та списків
        // Графіки мають свої індикатори isLoading
        return (
            <Container sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh'}}>
                <CircularProgress/>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{mt: 4, mb: 4}}>
            <Typography variant="h4" component="h1" gutterBottom sx={{mb: 3}}>
                Інформаційна Панель
            </Typography>

            <Grid container spacing={3} sx={{mb: 3}}>
                <Grid item size={12}>
                    <Grid container spacing={3} sx={{mb: 3}}>
                        <StatCard title="Всього Хостів" value={hostStore.hosts.length}
                                  icon={<DnsIcon fontSize="inherit"/>} linkTo="/hosts"/>
                        <StatCard title="Хости з Проблемами" value={hostsWithProblemsCount}
                                  icon={<ReportProblemIcon fontSize="inherit"/>}
                                  color={hostsWithProblemsCount > 0 ? "error.main" : "success.main"}
                                  linkTo="/problems"/>
                        <StatCard title="Активні Проблеми" value={triggerStore.activeProblems.length}
                                  icon={<ErrorOutlineIcon fontSize="inherit"/>}
                                  color={triggerStore.activeProblems.length > 0 ? "error.main" : "text.secondary"}
                                  linkTo="/problems"/>
                        <StatCard title="Агенти в Очікуванні" value={hostStore.pendingAgents.length}
                                  icon={<HourglassEmptyIcon fontSize="inherit"/>}
                                  color={hostStore.pendingAgents.length > 0 ? "warning.main" : "text.secondary"}
                                  linkTo="/agents/pending"/>
                    </Grid>
                </Grid>

                <Grid item size={12}>
                    <Paper elevation={3} sx={{p: 2}}>
                        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1}}>
                            <Typography variant="h6" gutterBottom>Останні Активні Проблеми (макс. 5)</Typography>
                            <Button component={RouterLink} to="/problems" size="small" endIcon={<ArrowForwardIosIcon/>}>
                                Всі проблеми
                            </Button>
                        </Box>
                        {triggerStore.isLoadingProblems && <CircularProgress size={20}/>}
                        {triggerStore.errorProblems && <Alert severity="error">{triggerStore.errorProblems}</Alert>}
                        {!triggerStore.isLoadingProblems && triggerStore.activeProblems.length === 0 && (
                            <Typography variant="body2">Немає активних проблем.</Typography>
                        )}
                        <List dense>
                            {triggerStore.activeProblems.slice(0, 5).map((problem) => (
                                <React.Fragment key={problem.id}>
                                    <ListItem
                                        button
                                        component={RouterLink}
                                        to={`/hosts/${problem.host_id}`}
                                        sx={{'&:hover': {backgroundColor: (theme) => theme.palette.action.hover}}}
                                    >
                                        <ListItemIcon sx={{minWidth: 'auto', mr: 1.5}}>
                                            <Chip
                                                label={(problem.severity_override || 'N/A').toUpperCase()}
                                                color={getSeverityChipColor(problem.severity_override)}
                                                size="small"
                                                sx={{width: 110, textOverflow: 'ellipsis', fontWeight: 'bold'}}
                                            />
                                        </ListItemIcon>
                                        <ListItemText
                                            primaryTypographyProps={{noWrap: true, style: {fontWeight: 500}}}
                                            primary={`${getHostNameById(problem.host_id)}: ${problem.name_override || problem.internal_trigger_key}`}
                                            secondary={`Виникла: ${formatDate(problem.problem_started_at)} | Значення: ${problem.current_metric_value_snapshot || 'N/A'} (Поріг: ${problem.user_threshold_value})`}
                                        />
                                    </ListItem>
                                    <Divider variant="inset" component="li"/>
                                </React.Fragment>
                            ))}
                        </List>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{mb: 3}}>
                <Grid item size={6}>
                    <Paper elevation={3} sx={{p: 2, height: 350, display: 'flex', flexDirection: 'column'}}>
                        <Typography variant="h6" gutterBottom align="center">Доступність Хостів</Typography>
                        {hostStore.isLoadingHosts && <CircularProgress sx={{alignSelf: 'center', mt: 5}}/>}
                        {!hostStore.isLoadingHosts && hostStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{top: 0, right: 0, bottom: 20, left: 0}}>
                                    <Pie
                                        data={hostStatusData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        labelLine={false}
                                        label={<CustomPieLabel/>}
                                    >
                                        {hostStatusData.map((entry, index) => (
                                            <Cell key={`cell-availability-${index}`}
                                                  fill={COLORS_AVAILABILITY[entry.name.toLowerCase().replace(/\s+/g, '_')] || '#8884d8'}/>
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [`${value} хостів`, name]}/>
                                    <Legend iconSize={10}/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (!hostStore.isLoadingHosts &&
                            <Typography align="center" sx={{mt: 5}}>Немає даних про доступність
                                хостів.</Typography>)}
                    </Paper>
                </Grid>

                <Grid item size={6}>
                    <Paper elevation={3} sx={{p: 2, height: 350, display: 'flex', flexDirection: 'column'}}>
                        <Typography variant="h6" gutterBottom align="center">Проблеми за Серйозністю</Typography>
                        {triggerStore.isLoadingProblems && <CircularProgress sx={{alignSelf: 'center', mt: 5}}/>}
                        {!triggerStore.isLoadingProblems && problemsBySeverityData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={problemsBySeverityData} layout="vertical"
                                          margin={{top: 20, right: 30, left: 30, bottom: 5}}>
                                    <CartesianGrid strokeDasharray="3 3"/>
                                    <XAxis type="number" allowDecimals={false}/>
                                    <YAxis type="category" dataKey="name" width={120} interval={0}/>
                                    <Tooltip formatter={(value, name) => [value, `Серйозність: ${name}`]}/>
                                    <Bar dataKey="value" name="К-сть Проблем" barSize={25}>
                                        {problemsBySeverityData.map((entry, index) => (
                                            <Cell key={`cell-severity-${index}`} fill={entry.fill}/>
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (!triggerStore.isLoadingProblems &&
                            <Typography align="center" sx={{mt: 5}}>Немає активних проблем.</Typography>)}
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{mb: 3}}>

                <Grid item size={12}>
                    <Paper elevation={1} sx={{p: 2, mb: 3}}>
                        <TextField
                            select
                            label="Показати графіки для хоста"
                            value={selectedHostIdForCharts}
                            onChange={(e) => setSelectedHostIdForCharts(e.target.value)}
                            fullWidth
                            variant="outlined"
                            disabled={hostStore.isLoadingHosts || hostStore.hosts.length === 0}
                            helperText={hostStore.hosts.length === 0 && !hostStore.isLoadingHosts ? "Немає доступних хостів" : ""}
                        >
                            <MenuItem value="">
                                <em>-- Не вибрано --</em>
                            </MenuItem>
                            {hostStore.hosts.map((host) => (
                                <MenuItem key={host.id} value={host.id}>
                                    {host.name} ({host.ip_address || 'IP не вказано'})
                                </MenuItem>
                            ))}
                        </TextField>
                    </Paper>
                    <LineChartCard
                        title={cpuChartData.metricName} // Назва тепер включає ім'я хоста
                        data={cpuChartData.data}
                        dataKeyY="value"
                        yAxisLabel="%"
                        isLoading={cpuChartData.isLoading} // Використовуємо індивідуальний isLoading
                        error={cpuChartData.error}
                        yDomain={[0, 100]}
                    />

                    <LineChartCard
                        title={ramChartData.metricName} // Назва тепер включає ім'я хоста
                        data={ramChartData.data}
                        dataKeyY="value"
                        yAxisLabel={
                            hostStore.hosts.find(h => h.id === selectedHostIdForCharts)?.host_type === 'mikrotik_snmp'
                                ? "байт" : "%"
                        }
                        isLoading={ramChartData.isLoading} // Використовуємо індивідуальний isLoading
                        error={ramChartData.error}
                        yDomain={
                            hostStore.hosts.find(h => h.id === selectedHostIdForCharts)?.host_type === 'mikrotik_snmp'
                                ? undefined : [0, 100]
                        }
                    />
                </Grid>
            </Grid>
        </Container>
    );
});

export default DashboardPage;