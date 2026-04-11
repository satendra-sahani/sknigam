'use client';

import { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend);

interface HourlyTurnoutData {
  hour: string;
  cumulativeVoters: number;
  cumulativePercent: number;
}

interface HourlyChartProps {
  data: HourlyTurnoutData[];
  previousElectionData?: { hour: string; cumulativeVoters: number }[];
}

export default function HourlyChart({ data, previousElectionData }: HourlyChartProps) {
  const chartRef = useRef<any>(null);

  const createGradient = (ctx: CanvasRenderingContext2D, chartArea: { top: number; bottom: number }) => {
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.15)');
    gradient.addColorStop(0.5, 'rgba(79, 70, 229, 0.05)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');
    return gradient;
  };

  const chartData = {
    labels: data.map((d) => d.hour),
    datasets: [
      {
        label: 'Cumulative Voters',
        data: data.map((d) => d.cumulativeVoters),
        fill: true,
        borderColor: '#4f46e5',
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(79, 70, 229, 0.1)';
          return createGradient(ctx, chartArea);
        },
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#4f46e5',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 3,
        tension: 0.4,
        borderWidth: 2.5,
      },
      {
        label: 'Turnout %',
        data: data.map((d) => d.cumulativePercent),
        fill: false,
        borderColor: '#22c55e',
        borderDash: [5, 5],
        pointBackgroundColor: '#22c55e',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.4,
        borderWidth: 2,
        yAxisID: 'y1',
      },
      ...(previousElectionData
        ? [
            {
              label: 'Previous Election',
              data: previousElectionData.map((d) => d.cumulativeVoters),
              fill: false,
              borderColor: '#94a3b8',
              borderDash: [8, 4],
              pointRadius: 0,
              pointHoverRadius: 4,
              pointBackgroundColor: '#94a3b8',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              tension: 0.4,
              borderWidth: 1.5,
            },
          ]
        : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { size: 12, family: 'inherit' },
          color: '#64748b',
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        padding: 14,
        cornerRadius: 12,
        displayColors: true,
        titleFont: { size: 13, weight: 'bold' as const },
        bodyFont: { size: 12 },
        bodySpacing: 6,
        boxPadding: 6,
        usePointStyle: true,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11 },
          color: '#94a3b8',
        },
        border: { display: false },
      },
      y: {
        position: 'left' as const,
        title: {
          display: true,
          text: 'Voters',
          font: { size: 12 },
          color: '#94a3b8',
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          drawBorder: false,
        },
        ticks: {
          font: { size: 11 },
          color: '#94a3b8',
        },
        border: { display: false, dash: [4, 4] },
      },
      y1: {
        position: 'right' as const,
        title: {
          display: true,
          text: 'Turnout %',
          font: { size: 12 },
          color: '#94a3b8',
        },
        grid: { display: false },
        ticks: {
          font: { size: 11 },
          color: '#94a3b8',
          callback: (value: any) => `${value}%`,
        },
        border: { display: false },
        min: 0,
        max: 100,
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 transition-all duration-200">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Hourly Voter Turnout</h3>
          <p className="text-sm text-slate-500 mt-0.5">Today vs Target</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-xs text-slate-500">Voters</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500">Turnout %</span>
          </div>
          {previousElectionData && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span className="text-xs text-slate-500">Previous</span>
            </div>
          )}
        </div>
      </div>
      <div className="h-80">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
}
