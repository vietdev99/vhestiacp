import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import {
  ArrowLeft,
  Activity,
  RefreshCw,
  Cpu,
  Loader2
} from 'lucide-react';
import clsx from 'clsx';

// Period options
const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'biennially', label: 'Biennially' },
  { value: 'triennially', label: 'Triennially' }
];

// Chart colors for different data series
const CHART_COLORS = [
  { border: 'rgb(59, 130, 246)', background: 'rgba(59, 130, 246, 0.1)' },  // blue
  { border: 'rgb(16, 185, 129)', background: 'rgba(16, 185, 129, 0.1)' },  // green
  { border: 'rgb(245, 158, 11)', background: 'rgba(245, 158, 11, 0.1)' },  // amber
  { border: 'rgb(239, 68, 68)', background: 'rgba(239, 68, 68, 0.1)' },    // red
  { border: 'rgb(139, 92, 246)', background: 'rgba(139, 92, 246, 0.1)' }   // purple
];

export default function Statistics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const period = searchParams.get('period') || 'daily';

  // Fetch available RRD charts
  const { data: rrdList, isLoading: listLoading, error: listError } = useQuery({
    queryKey: ['rrd-list'],
    queryFn: async () => {
      const res = await api.get('/api/system/rrd/list');
      return res.data;
    }
  });

  const handlePeriodChange = (newPeriod) => {
    setSearchParams({ period: newPeriod });
  };

  if (listLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (listError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load RRD charts</p>
      </div>
    );
  }

  const charts = rrdList?.charts || [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/server-services" className="btn btn-secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <Link to="/server-services?cpu" className="btn btn-secondary">
            <Cpu className="w-4 h-4 mr-2" />
            Advanced Details
          </Link>
        </div>
        <div className="flex items-center gap-1">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                period === p.value
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-border'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Activity className="w-7 h-7" />
        Server Statistics
      </h1>

      {/* Charts */}
      <div className="space-y-8">
        {charts.map(chart => (
          <RRDChart
            key={chart.service}
            chart={chart}
            period={period}
          />
        ))}
      </div>

      {charts.length === 0 && (
        <div className="card p-12 text-center">
          <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No RRD charts available</p>
        </div>
      )}
    </div>
  );
}

// RRD Chart Component
function RRDChart({ chart, period }) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['rrd-export', chart.service, period],
    queryFn: async () => {
      const res = await api.post('/api/system/rrd/export', {
        service: chart.service,
        period
      });
      return res.data;
    },
    staleTime: 60000 // 1 minute
  });

  // Draw chart when data changes
  useEffect(() => {
    if (!canvasRef.current || !data?.data) return;

    const ctx = canvasRef.current.getContext('2d');
    const canvas = canvasRef.current;

    // Destroy previous chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current = null;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Parse RRD data
    const { meta, data: rrdData } = data;
    if (!meta?.legend || !rrdData) return;

    const legends = meta.legend;
    const step = meta.step || 300;
    const start = meta.start;

    // Filter out null values and prepare data points
    const validData = rrdData.filter(row => row.some(v => v !== null));
    if (validData.length === 0) return;

    // Create time labels
    const labels = validData.map((_, index) => {
      const timestamp = (start + (index * step)) * 1000;
      const date = new Date(timestamp);
      if (period === 'daily') {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } else if (period === 'weekly') {
        return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    });

    // Draw chart using Canvas API
    drawLineChart(ctx, canvas, labels, validData, legends, data.unit);

  }, [data, period]);

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
        <h2 className="text-lg font-semibold">{chart.title}</h2>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
        >
          <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
        </button>
      </div>
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-500">
            Failed to load chart data
          </div>
        ) : (
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={800}
              height={300}
              className="w-full h-auto max-h-72"
            />
            {/* Legend */}
            {data?.meta?.legend && (
              <div className="flex items-center justify-center gap-6 mt-4">
                {data.meta.legend.map((legend, index) => (
                  <div key={legend} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length].border }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{legend}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Draw line chart using Canvas API
function drawLineChart(ctx, canvas, labels, data, legends, unit) {
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const width = canvas.width;
  const height = canvas.height;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Get theme from document
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Find min/max values
  let maxValue = 0;
  let minValue = Infinity;
  data.forEach(row => {
    row.forEach(val => {
      if (val !== null) {
        maxValue = Math.max(maxValue, val);
        minValue = Math.min(minValue, val);
      }
    });
  });
  if (minValue === Infinity) minValue = 0;
  if (maxValue === minValue) maxValue = minValue + 1;

  // Add some padding to max
  maxValue = maxValue * 1.1;
  minValue = Math.max(0, minValue * 0.9);

  // Draw grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);

  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartHeight / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    // Y-axis labels
    const value = maxValue - ((maxValue - minValue) / gridLines) * i;
    ctx.fillStyle = textColor;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatValue(value), padding.left - 10, y + 4);
  }

  ctx.setLineDash([]);

  // Draw X-axis labels
  const labelStep = Math.ceil(labels.length / 10);
  ctx.fillStyle = textColor;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';

  labels.forEach((label, index) => {
    if (index % labelStep === 0) {
      const x = padding.left + (chartWidth / (labels.length - 1)) * index;
      ctx.fillText(label, x, height - 10);
    }
  });

  // Draw data lines
  legends.forEach((legend, seriesIndex) => {
    const color = CHART_COLORS[seriesIndex % CHART_COLORS.length];

    // Draw fill
    ctx.fillStyle = color.background;
    ctx.beginPath();

    let firstPoint = true;
    data.forEach((row, index) => {
      const value = row[seriesIndex];
      if (value === null) return;

      const x = padding.left + (chartWidth / (data.length - 1)) * index;
      const y = padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

      if (firstPoint) {
        ctx.moveTo(x, padding.top + chartHeight);
        ctx.lineTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
    });

    // Close the fill path
    if (!firstPoint) {
      const lastValidIndex = data.length - 1;
      const lastX = padding.left + (chartWidth / (data.length - 1)) * lastValidIndex;
      ctx.lineTo(lastX, padding.top + chartHeight);
      ctx.closePath();
      ctx.fill();
    }

    // Draw line
    ctx.strokeStyle = color.border;
    ctx.lineWidth = 2;
    ctx.beginPath();

    firstPoint = true;
    data.forEach((row, index) => {
      const value = row[seriesIndex];
      if (value === null) return;

      const x = padding.left + (chartWidth / (data.length - 1)) * index;
      const y = padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

      if (firstPoint) {
        ctx.moveTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  });

  // Draw unit label
  if (unit) {
    ctx.fillStyle = textColor;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(unit, padding.left, padding.top - 5);
  }
}

// Format large numbers
function formatValue(value) {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(1);
}
