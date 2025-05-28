// src/components/charts/CustomTooltip.jsx (або в тому ж файлі, що й LineChartCard)
import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// Функція для форматування мітки часу (якщо потрібна в Tooltip)
const formatTooltipLabel = (label) => {
    try {
        return new Date(label).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) {
        return label;
    }
};

const CustomTooltip = ({ active, payload, label, yAxisLabel, title }) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0]; // Припускаємо один Line в графіку
        return (
            <Paper elevation={3} sx={{ p: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
                <Typography variant="caption" display="block" gutterBottom>
                    {formatTooltipLabel(label)} {/* Форматуємо мітку часу */}
                </Typography>
                <Typography variant="body2" sx={{ color: dataPoint.stroke || dataPoint.fill || '#000' }}>
                    {/* title графіка або dataPoint.name (якщо є) */}
                    {title || dataPoint.name}: <strong>{parseFloat(dataPoint.value).toFixed(2)}{yAxisLabel}</strong>
                </Typography>
                {/* Якщо є інші лінії на графіку, можна їх додати тут, перебираючи payload */}
            </Paper>
        );
    }
    return null;
};

export default CustomTooltip;