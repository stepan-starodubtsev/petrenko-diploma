// src/components/charts/LineChartCard.jsx
import React from 'react';
import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// Імпортуй кастомний Tooltip
import CustomTooltip from './CustomTooltip'; // Або шлях до файлу

const formatXAxisTick = (timestamp) => {
    try {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return timestamp;
    }
};

const LineChartCard = ({ title, data, dataKeyX = "timestamp", dataKeyY = "value", yAxisLabel = "", isLoading, error, yDomain = [0, 100] }) => {
    // ... (код для isLoading, error, no data - як раніше) ...
    if (isLoading) { /* ... */ }
    if (error) { /* ... */ }
    if (!data || data.length === 0) { /* ... */ }

    const processedData = data.map(item => ({
        ...item,
        [dataKeyY]: parseFloat(item[dataKeyY])
    })).filter(item => !isNaN(item[dataKeyY]));


    return (
        <Paper elevation={3} sx={{ p: 2, height: 350, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom align="center">
                {title}
            </Typography>
            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={processedData} margin={{ top: 5, right: 30, left: 0, bottom: 25 }}> {/* Змінив bottom та left */}
                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis
                            dataKey={dataKeyX}
                            tickFormatter={formatXAxisTick}
                            angle={-30}
                            textAnchor="end"
                            height={50}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            unit={yAxisLabel}
                            domain={yDomain}
                            tickFormatter={(value) => value.toFixed(0)}
                            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 10, style: {textAnchor: 'middle'} }} // Додав мітку для осі Y
                        />
                        {/* Використовуємо кастомний Tooltip */}
                        <Tooltip content={<CustomTooltip yAxisLabel={yAxisLabel} title={title.split('(')[0].trim()} />} />

                        <Legend verticalAlign="top" height={36}/>
                        <Line
                            type="monotone"
                            dataKey={dataKeyY}
                            name={title.split('(')[0].trim()} // Для легенди можна взяти назву без хоста
                            stroke="#8884d8"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
};

export default LineChartCard;