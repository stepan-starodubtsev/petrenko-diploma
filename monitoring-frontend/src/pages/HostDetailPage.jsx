// src/pages/HostDetailPage.jsx
import React, {useCallback, useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {observer} from 'mobx-react-lite';
import {useStores} from '../stores';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import {runInAction} from "mobx";

// Припускаємо, що LineChartCard знаходиться тут або імпортований правильно
import LineChartCard from '../components/charts/LineChartCard'; // Перевір шлях

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString();
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString;
    }
};

const formatUptime = (totalSeconds) => {
    if (totalSeconds === null || totalSeconds === undefined || typeof totalSeconds !== 'number' || totalSeconds < 0) return 'N/A';
    totalSeconds = Math.floor(totalSeconds);
    const days = Math.floor(totalSeconds / (24 * 3600));
    totalSeconds %= (24 * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    let parts = [];
    if (days > 0) parts.push(`${days}д`);
    if (hours > 0) parts.push(`${hours}г`);
    if (minutes > 0) parts.push(`${minutes}хв`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}с`);
    return parts.join(' ') || '0с';
};

const HostDetailPage = observer(() => {
    const {hostId} = useParams();
    const {hostStore, metricStore, triggerStore} = useStores();

    const [currentTab, setCurrentTab] = useState(0);
    const [selectedMetricKeyForHistory, setSelectedMetricKeyForHistory] = useState('');
    const [availableMetrics, setAvailableMetrics] = useState([]);

    // Стани для даних графіків на вкладці "Огляд"
    const initialChartState = {data: [], isLoading: true, error: null, title: ""};
    const [overviewCpuData, setOverviewCpuData] = useState({...initialChartState, title: "Завантаження CPU"});
    const [overviewRamData, setOverviewRamData] = useState({...initialChartState, title: "Використання RAM"});
    const [overviewDiskData, setOverviewDiskData] = useState({...initialChartState, title: "Використання Диску"});
    const [overviewUptimeData, setOverviewUptimeData] = useState({...initialChartState, title: "Динаміка Uptime"});


    const getMetricDefinitionsForHostType = useCallback((hostType) => {
        if (hostType === 'windows_agent' || hostType === 'ubuntu_agent') {
            return [
                { key: "system.cpu.utilization", name: "Завантаження CPU", unit: "%" },
                { key: "system.memory.used_percent", name: "Використано пам'яті (%)", unit: "%" },
                { key: "system.disk.free_gb", name: "Вільно на диску (/)", unit: "GB" },
                { key: "system.uptime_seconds", name: "Час роботи системи", unit: "тривалість" },
            ];
        } else if (hostType === 'mikrotik_snmp') {
            return [
                { key: "mikrotik.system.uptime", name: "Час роботи MikroTik", unit: "тривалість" },
                { key: "mikrotik.system.memory.used", name: "Використано пам'яті (байт)", unit: "bytes" },
                { key: "mikrotik.system.memory.total", name: "Загальна пам'ять (байт)", unit: "bytes" },
                { key: "mikrotik.system.memory.used_percent", name: "Використано пам'яті (%)", unit: "%" }, // <--- Віртуальна метрика
                { key: "mikrotik.system.cpu.load", name: "Завантаження CPU", unit: "%" },
                { key: "mikrotik.interface.ether1.in.octets", name: "ether1 - Вхідні октети", unit: "bytes" },
                { key: "mikrotik.interface.ether1.out.octets", name: "ether1 - Вихідні октети", unit: "bytes" },
                { key: "mikrotik.interface.ether1.oper_status", name: "ether1 - Операційний статус", unit: "" }, // <--- Нова метрика
                { key: "mikrotik.interface.ether2.in.octets", name: "ether2 - Вхідні октети", unit: "bytes" },
                { key: "mikrotik.interface.ether2.out.octets", name: "ether2 - Вихідні октети", unit: "bytes" },
                { key: "mikrotik.interface.ether2.oper_status", name: "ether2 - Операційний статус", unit: "" }, // <--- Нова метрика
            ];
        }
        return [];
    }, []);

    const getDiskUsedPercentMetricKey = useCallback(() => {
        if (!hostStore.currentHost || !hostStore.currentHost.host_type) return null;
        const definitions = getMetricDefinitionsForHostType(hostStore.currentHost.host_type);
        const diskMetric = definitions.find(m => m.key.includes("system.disk.free_gb"));
        return diskMetric ? diskMetric.key : null;
    }, [hostStore.currentHost, getMetricDefinitionsForHostType]);

    useEffect(() => {
        if (hostId) {
            hostStore.fetchHostById(hostId);
            triggerStore.fetchTriggerConfigsForHost(hostId);
            metricStore.clearCurrentHostMetrics(hostId);
            // Скидаємо стани графіків огляду при зміні хоста
            setOverviewCpuData({...initialChartState, title: "Завантаження CPU"});
            setOverviewRamData({...initialChartState, title: "Використання RAM"});
            setOverviewDiskData({...initialChartState, title: "Використання Диску"});
            setOverviewUptimeData({...initialChartState, title: "Динаміка Uptime"});
        }
    }, [hostId, hostStore, metricStore, triggerStore]);

    // Завантаження availableMetrics та даних для графіків огляду
    useEffect(() => {
        const fetchOverviewMetrics = async () => {
            if (hostStore.currentHost && hostStore.currentHost.host_type && hostId) {
                const definitions = getMetricDefinitionsForHostType(hostStore.currentHost.host_type);
                setAvailableMetrics(definitions);

                if (definitions.length > 0 && !selectedMetricKeyForHistory) {
                    setSelectedMetricKeyForHistory(definitions[0].key);
                }

                const diskKey = getDiskUsedPercentMetricKey();
                const overviewMetricsSetup = [
                    {
                        stateSetter: setOverviewCpuData,
                        metricKey: hostStore.currentHost.host_type === 'mikrotik_snmp' ? "mikrotik.system.cpu.load" : "system.cpu.utilization",
                        title: "Завантаження CPU",
                        yAxisLabel: "%",
                        yDomain: [0, 100]
                    },
                    {
                        stateSetter: setOverviewRamData,
                        metricKey: hostStore.currentHost.host_type === 'mikrotik_snmp' ? "mikrotik.system.memory.used" : "system.memory.used_percent",
                        title: hostStore.currentHost.host_type === 'mikrotik_snmp' ? "Використано RAM (MB)" : "Використано RAM (%)",
                        yAxisLabel: hostStore.currentHost.host_type === 'mikrotik_snmp' ? "MB" : "%",
                        yDomain: hostStore.currentHost.host_type === 'mikrotik_snmp' ? undefined : [0, 100],
                        dataFormatter: hostStore.currentHost.host_type === 'mikrotik_snmp' ? (val => val / (1024 * 1024)) : undefined
                    },
                    {
                        stateSetter: setOverviewDiskData,
                        metricKey: diskKey,
                        title: "Вільно на диску (/)",
                        yAxisLabel: "GB",
                        yDomain: [0, 100]
                    },
                    {
                        stateSetter: setOverviewUptimeData,
                        metricKey: hostStore.currentHost.host_type === 'mikrotik_snmp' ? "mikrotik.system.uptime" : "system.uptime_seconds",
                        title: "Час Роботи (сек)",
                        yAxisLabel: "сек",
                        dataFormatter: formatUptime,
                        isUptime: true
                    } // isUptime для іншого форматування tooltip
                ];

                const endTime = new Date();
                const startTime = new Date(endTime.getTime() - 1 * 60 * 60 * 1000); // Дані за останню годину для графіків огляду

                for (const {stateSetter, metricKey, title, dataFormatter} of overviewMetricsSetup) {
                    if (!metricKey) { // Якщо ключ диска не знайдено, наприклад
                        stateSetter({
                            data: [],
                            isLoading: false,
                            error: "Метрика не визначена",
                            title: title,
                            hostName: hostStore.currentHost.name
                        });
                        continue;
                    }
                    stateSetter(prev => ({
                        ...prev,
                        isLoading: true,
                        error: null,
                        title: title,
                        hostName: hostStore.currentHost.name
                    }));
                    try {
                        await metricStore.fetchMetricHistory(hostId, metricKey, startTime.toISOString(), endTime.toISOString(), 30); // 30 точок для графіка
                        runInAction(() => {
                            const rawData = metricStore.getMetrics(hostId, metricKey);
                            const chartPoints = rawData
                                .map(m => ({
                                    timestamp: m.timestamp,
                                    value: dataFormatter && metricKey.includes("uptime") ? m.value_numeric // для uptime не форматуємо в data, а в tooltip
                                        : dataFormatter ? dataFormatter(m.value_numeric)
                                            : m.value_numeric
                                }))
                                .filter(m => m.value !== null && m.value !== undefined && !isNaN(m.value))
                                .slice().reverse();
                            stateSetter({
                                data: chartPoints,
                                isLoading: false,
                                error: null,
                                title: title,
                                hostName: hostStore.currentHost.name
                            });
                        });
                    } catch (err) {
                        console.error(`Error fetching overview metric ${metricKey} for ${hostStore.currentHost.name}:`, err);
                        runInAction(() => stateSetter({
                            data: [],
                            isLoading: false,
                            error: err.message || `Помилка даних ${title}`,
                            title: title,
                            hostName: hostStore.currentHost.name
                        }));
                    }
                }
            }
        };
        if (!hostStore.isLoadingCurrentHost) { // Запускаємо тільки коли дані хоста завантажені
            fetchOverviewMetrics();
        }
    }, [hostStore.currentHost, hostId, metricStore, getMetricDefinitionsForHostType, getDiskUsedPercentMetricKey]);

    // Завантаження повної історії для вибраної метрики на вкладці "Метрики"
    useEffect(() => {
        if (hostId && selectedMetricKeyForHistory && currentTab === 1) {
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - 6 * 60 * 60 * 1000); // Наприклад, за 6 годин
            metricStore.fetchMetricHistory(hostId, selectedMetricKeyForHistory, startTime.toISOString(), endTime.toISOString(), 120); // Більше точок для детального графіка
        }
    }, [hostId, selectedMetricKeyForHistory, currentTab, metricStore]);


    const handleTabChange = (event, newValue) => setCurrentTab(newValue);
    const handleEditTriggerThreshold = (triggerConfig) => {
        const currentThreshold = triggerConfig.user_threshold_value;
        const newThreshold = prompt(`Введіть новий поріг для "${triggerConfig.name_override || triggerConfig.internal_trigger_key}":`, currentThreshold);

        if (newThreshold !== null && newThreshold.trim() !== "" && newThreshold.trim() !== currentThreshold) {
            triggerStore.editTriggerConfig(triggerConfig.id, hostId, {user_threshold_value: newThreshold.trim()})
                .then(() => {
                    console.log("Поріг оновлено");
                    triggerStore.fetchTriggerConfigsForHost(hostId);
                })
                .catch(err => {
                    console.error("Помилка оновлення порогу:", err);
                    alert(`Помилка оновлення порогу: ${err.response?.data?.detail || err.message}`);
                });
        }
    };

    if (hostStore.isLoadingCurrentHost) {
        return <Container sx={{textAlign: 'center', mt: 5}}><CircularProgress/></Container>;
    }
    if (hostStore.errorCurrentHost) {
        return <Container><Alert severity="error" sx={{mt: 2}}>Помилка завантаження даних
            хоста: {hostStore.errorCurrentHost}</Alert></Container>;
    }
    if (!hostStore.currentHost) {
        return <Container sx={{textAlign: 'center', mt: 5}}><Typography>Хост з ID {hostId} не
            знайдено.</Typography></Container>;
    }

    const {currentHost} = hostStore;
    const metricsHistoryForSelectedKeyOnTab = metricStore.getMetrics(hostId, selectedMetricKeyForHistory);
    const triggerConfigs = triggerStore.getTriggerConfigs(hostId);

    return (
        <Container maxWidth="xl" sx={{mt: 4, mb: 4}}> {/* Змінив maxWidth на xl для більшого простору */}
            <Paper elevation={3} sx={{p: {xs: 2, md: 3}, mb: 3}}>
                {/* ... Інформація про хост (Grid) ... як було ... */}
                <Typography variant="h4" component="h1" gutterBottom>{currentHost.name}</Typography>
                <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}><Typography><strong>IP Адреса:</strong> {currentHost.ip_address || 'N/A'}
                    </Typography></Grid>
                    <Grid item xs={12} sm={6}><Typography><strong>Тип:</strong> {currentHost.host_type}
                    </Typography></Grid>
                    <Grid item xs={12} sm={6}><Box
                        sx={{display: 'flex', alignItems: 'center', flexWrap: 'wrap'}}><Typography component="span"
                                                                                                   sx={{
                                                                                                       mr: 0.5,
                                                                                                       fontWeight: 'bold'
                                                                                                   }}>Статус:</Typography><Chip
                        label={currentHost.availability_status || 'unknown'}
                        color={currentHost.availability_status === 'up' ? 'success' : currentHost.availability_status === 'down' ? 'error' : currentHost.availability_status === 'pending_approval' ? 'warning' : 'default'}
                        size="small"/></Box></Grid>
                    <Grid item xs={12} sm={6}><Typography><strong>Останні
                        дані:</strong> {formatDate(currentHost.last_metric_at)}</Typography></Grid>
                    {currentHost.host_type === 'mikrotik_snmp' && (<Grid item xs={12} sm={6}><Typography><strong>SNMP
                        Community:</strong> {currentHost.snmp_community || 'N/A'}</Typography></Grid>)}
                    <Grid item xs={12}><Typography><strong>Нотатки:</strong> {currentHost.notes || 'N/A'}
                    </Typography></Grid>
                </Grid>
            </Paper>

            <Box sx={{borderBottom: 1, borderColor: 'divider', mb: 2}}>
                <Tabs value={currentTab} onChange={handleTabChange} aria-label="Деталі хоста" variant="scrollable"
                      scrollButtons="auto">
                    <Tab label="Огляд" id="tab-overview" aria-controls="panel-overview"/>
                    <Tab label="Метрики" id="tab-metrics" aria-controls="panel-metrics"/>
                    <Tab label="Тригери" id="tab-triggers" aria-controls="panel-triggers"/>
                </Tabs>
            </Box>

            {currentTab === 0 && (
                <Paper elevation={3} sx={{p: 2}} id="panel-overview" role="tabpanel" aria-labelledby="tab-overview">
                    <Typography variant="h6" gutterBottom>Ключові показники (Графіки за останню годину)</Typography>
                    <Grid container spacing={2}>
                        <Grid item size={6}>
                            <LineChartCard
                                title={overviewCpuData.title}
                                data={overviewCpuData.data}
                                dataKeyY="value"
                                yAxisLabel="%"
                                isLoading={overviewCpuData.isLoading}
                                error={overviewCpuData.error}
                                yDomain={[0, 100]}
                            />
                        </Grid>
                        <Grid item size={6}>
                            <LineChartCard
                                title={overviewRamData.title}
                                data={overviewRamData.data}
                                dataKeyY="value"
                                yAxisLabel={overviewRamData.yAxisLabel}
                                isLoading={overviewRamData.isLoading}
                                error={overviewRamData.error}
                                yDomain={overviewRamData.yDomain}
                            />
                        </Grid>
                        <Grid item size={6}>
                            <LineChartCard
                                title={overviewDiskData.title}
                                data={overviewDiskData.data}
                                dataKeyY="value"
                                yAxisLabel="%"
                                isLoading={overviewDiskData.isLoading}
                                error={overviewDiskData.error}
                                yDomain={[0, 100]}
                            />
                        </Grid>
                        <Grid item size={6}>
                            <LineChartCard
                                title={overviewUptimeData.title}
                                data={overviewUptimeData.data}
                                dataKeyY="value" // Це буде сире значення секунд
                                yAxisLabel="сек" // або відформатувати вісь Y для днів/годин
                                isLoading={overviewUptimeData.isLoading}
                                error={overviewUptimeData.error}
                                // yDomain не встановлюємо, Recharts визначить автоматично
                                // Для Tooltip, якщо потрібно форматувати uptime, CustomTooltip має це робити
                                tooltipFormatter={(value) => formatUptime(value)} // Передаємо кастомний форматер для тултіпа
                            />
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {currentTab === 1 && ( /* Вкладка Метрики */
                <Paper elevation={3} sx={{p: 2}} id="panel-metrics" role="tabpanel" aria-labelledby="tab-metrics">
                    <Typography variant="h6" gutterBottom>Історія Метрик</Typography>
                    <TextField
                        select
                        label="Виберіть метрику"
                        value={selectedMetricKeyForHistory}
                        onChange={(e) => setSelectedMetricKeyForHistory(e.target.value)}
                        helperText="Виберіть метрику для відображення історії"
                        fullWidth
                        variant="outlined"
                        sx={{mb: 2}}
                        disabled={availableMetrics.length === 0 || metricStore.isLoadingMetrics}
                    >
                        {availableMetrics.length === 0 && <MenuItem value="" disabled>Немає доступних метрик</MenuItem>}
                        {availableMetrics.map((metric) => (
                            <MenuItem key={metric.key} value={metric.key}>
                                {metric.name} ({metric.key})
                            </MenuItem>
                        ))}
                    </TextField>

                    {metricStore.isLoadingMetrics && selectedMetricKeyForHistory &&
                        <Box sx={{textAlign: 'center', my: 2}}><CircularProgress/></Box>}
                    {metricStore.errorMetrics && selectedMetricKeyForHistory &&
                        <Alert severity="error" sx={{mb: 2}}>Помилка завантаження метрики
                            "{selectedMetricKeyForHistory}": {metricStore.errorMetrics}</Alert>}

                    {!metricStore.isLoadingMetrics && !metricStore.errorMetrics && metricsHistoryForSelectedKeyOnTab.length === 0 && selectedMetricKeyForHistory && (
                        <Typography>Немає даних для вибраної метрики
                            "{availableMetrics.find(m => m.key === selectedMetricKeyForHistory)?.name}" за останню
                            годину.</Typography>
                    )}
                    {!metricStore.isLoadingMetrics && !metricStore.errorMetrics && metricsHistoryForSelectedKeyOnTab.length > 0 && (
                        <Box>
                            {/* Тут можна вставити LineChartCard для вибраної метрики */}
                            <LineChartCard
                                title={availableMetrics.find(m => m.key === selectedMetricKeyForHistory)?.name || selectedMetricKeyForHistory}
                                data={metricsHistoryForSelectedKeyOnTab.map(m => ({
                                    timestamp: m.timestamp,
                                    value: m.value_numeric !== null ? m.value_numeric : m.value_text // Переконайся, що value числове для графіка
                                }))}
                                dataKeyY="value"
                                yAxisLabel={availableMetrics.find(m => m.key === selectedMetricKeyForHistory)?.unit || ""}
                                isLoading={false} // Дані вже тут
                                error={null}
                                yDomain={selectedMetricKeyForHistory.includes("percent") || selectedMetricKeyForHistory.includes("utilization") || selectedMetricKeyForHistory.includes("cpu.load") ? [0, 100] : undefined}
                                tooltipFormatter={selectedMetricKeyForHistory.includes("uptime") ? (value) => formatUptime(value) : undefined}
                            />
                            {/* Або залишити список, якщо графік тут не потрібен */}
                            {/* <Typography variant="subtitle1" sx={{mb:1}}>Історія для: ...</Typography> <List>...</List> */}
                        </Box>
                    )}
                </Paper>
            )}

            {currentTab === 2 && ( /* Вкладка Тригери */
                <Paper elevation={3} sx={{p: 2}} id="panel-triggers" role="tabpanel" aria-labelledby="tab-triggers">
                    {/* ... Код для вкладки тригерів ... як було */}
                    <Typography variant="h6" gutterBottom>Налаштування Тригерів</Typography>
                    {triggerStore.isLoadingConfigs && <Box sx={{textAlign: 'center', my: 2}}><CircularProgress/></Box>}
                    {triggerStore.errorConfigs && <Alert severity="error">{triggerStore.errorConfigs}</Alert>}
                    {!triggerStore.isLoadingConfigs && !triggerStore.errorConfigs && triggerConfigs.length === 0 && (
                        <Typography>Для цього хоста немає налаштованих тригерів.</Typography>
                    )}
                    {!triggerStore.isLoadingConfigs && !triggerStore.errorConfigs && triggerConfigs.length > 0 && (
                        <List>
                            {triggerConfigs.map((tc) => (
                                <React.Fragment key={tc.id}>
                                    <ListItem
                                        secondaryAction={
                                            <Button variant="outlined" size="small"
                                                    onClick={() => handleEditTriggerThreshold(tc)}>Ред. поріг</Button>
                                        }>
                                        <ListItemText
                                            primary={tc.name_override || tc.internal_trigger_key}
                                            secondary={<>
                                                <span>Поріг: {tc.user_threshold_value} | </span><span>Увімкнено: {tc.is_enabled ? "Так" : "Ні"} | </span><span>Серйозність: {tc.severity_override || "Default"}</span></>}
                                        />
                                        <Chip label={tc.current_status || 'unknown'}
                                              color={tc.current_status === 'problem' ? 'error' : tc.current_status === 'ok' ? 'success' : 'default'}
                                              size="small" sx={{mr: 125}}/>
                                    </ListItem>
                                    <Divider component="li"/>
                                </React.Fragment>
                            ))}
                        </List>
                    )}
                </Paper>
            )}
        </Container>
    );
});

export default HostDetailPage;