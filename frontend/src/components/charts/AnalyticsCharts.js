import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { CHART_COLORS } from '../../utils/constants';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Chart configuration options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function(value) {
          return '₹' + value.toLocaleString();
        }
      }
    }
  }
};

const lineChartOptions = {
  ...chartOptions,
  elements: {
    line: {
      tension: 0.4,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function(value) {
          return '₹' + value.toLocaleString();
        }
      }
    }
  }
};

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
    },
    title: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          const label = context.label || '';
          const value = context.parsed || 0;
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${label}: ₹${value.toLocaleString()} (${percentage}%)`;
        }
      }
    }
  }
};

// Monthly Sales Line Chart
export const MonthlySalesChart = ({ data }) => {
  // Safety check for data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">No monthly sales data available</p>
      </div>
    );
  }

  const chartData = {
    labels: data.map(item => item.month || item.period || 'Unknown'),
    datasets: [
      {
        label: 'Revenue',
        data: data.map(item => item.total_revenue || item.revenue || 0),
        borderColor: CHART_COLORS.primary,
        backgroundColor: CHART_COLORS.primary + '20',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Orders',
        data: data.map(item => item.total_orders || item.orders || 0),
        borderColor: CHART_COLORS.secondary,
        backgroundColor: CHART_COLORS.secondary + '20',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Completed Orders',
        data: data.map(item => item.completed_orders || 0),
        borderColor: CHART_COLORS.success,
        backgroundColor: CHART_COLORS.success + '20',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return <Line data={chartData} options={lineChartOptions} />;
};

// Top Products Bar Chart
export const TopProductsChart = ({ data }) => {
  // Safety check for data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">No top products data available</p>
      </div>
    );
  }

  const chartData = {
    labels: data.map(item => item.name || item.product_name || 'Unknown'),
    datasets: [
      {
        label: 'Quantity Sold',
        data: data.map(item => item.total_quantity_sold || item.total_sold || 0),
        backgroundColor: CHART_COLORS.primary,
        borderColor: CHART_COLORS.primary,
        borderWidth: 1,
      },
      {
        label: 'Revenue',
        data: data.map(item => item.total_revenue || 0),
        backgroundColor: CHART_COLORS.secondary,
        borderColor: CHART_COLORS.secondary,
        borderWidth: 1,
      },
      {
        label: 'Order Count',
        data: data.map(item => item.order_count || 0),
        backgroundColor: CHART_COLORS.success,
        borderColor: CHART_COLORS.success,
        borderWidth: 1,
      },
    ],
  };

  return <Bar data={chartData} options={chartOptions} />;
};

// Category Sales Pie Chart
export const CategorySalesChart = ({ data }) => {
  // Safety check for data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">No category sales data available</p>
      </div>
    );
  }

  const chartData = {
    labels: data.map(item => item.category || 'Unknown'),
    datasets: [
      {
        data: data.map(item => item.total_revenue || item.revenue || 0),
        backgroundColor: [
          CHART_COLORS.primary,
          CHART_COLORS.secondary,
          CHART_COLORS.success,
          CHART_COLORS.warning,
          CHART_COLORS.danger,
          CHART_COLORS.info,
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  return <Pie data={chartData} options={pieChartOptions} />;
};

// Customer Acquisition Doughnut Chart
export const CustomerAcquisitionChart = ({ data }) => {
  // Safety check for data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">No customer acquisition data available</p>
      </div>
    );
  }

  const chartData = {
    labels: data.map(item => item.month || item.period || 'Unknown'),
    datasets: [
      {
        data: data.map(item => item.new_customers || item.customers || 0),
        backgroundColor: [
          CHART_COLORS.primary,
          CHART_COLORS.secondary,
          CHART_COLORS.success,
          CHART_COLORS.warning,
          CHART_COLORS.danger,
          CHART_COLORS.info,
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  return <Doughnut data={chartData} options={pieChartOptions} />;
};

// Sales Trends Combination Chart
export const SalesTrendsChart = ({ data }) => {
  // Safety check for data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">No sales trends data available</p>
      </div>
    );
  }

  const chartData = {
    labels: data.map(item => {
      const date = item.period ? new Date(item.period) : new Date();
      return date.toLocaleDateString();
    }),
    datasets: [
      {
        label: 'Revenue',
        data: data.map(item => item.revenue || 0),
        borderColor: CHART_COLORS.primary,
        backgroundColor: CHART_COLORS.primary + '20',
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Order Count',
        data: data.map(item => item.order_count || item.orders || 0),
        backgroundColor: CHART_COLORS.success,
        borderColor: CHART_COLORS.success,
        borderWidth: 1,
        yAxisID: 'y1',
      },
      {
        label: 'Avg Order Value',
        data: data.map(item => item.avg_order_value || 0),
        borderColor: CHART_COLORS.warning,
        backgroundColor: CHART_COLORS.warning + '20',
        fill: false,
        tension: 0.4,
        yAxisID: 'y',
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Revenue (₹)'
        },
        ticks: {
          callback: function(value) {
            return '₹' + value.toLocaleString();
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Order Count'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.datasetIndex === 0 || context.datasetIndex === 2) {
              label += '₹' + context.parsed.y.toLocaleString();
            } else {
              label += context.parsed.y.toLocaleString();
            }
            return label;
          }
        }
      }
    }
  };

  return <Line data={chartData} options={options} />;
};

// Customer Segmentation Bar Chart
export const CustomerSegmentationChart = ({ data }) => {
  // Safety check for data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">No customer segmentation data available</p>
      </div>
    );
  }

  const chartData = {
    labels: data.map(item => item.customer_segment || item.segment || 'Unknown'),
    datasets: [
      {
        label: 'Customers',
        data: data.map(item => item.customer_count || item.count || 0),
        backgroundColor: [
          CHART_COLORS.primary,
          CHART_COLORS.success,
          CHART_COLORS.warning,
          CHART_COLORS.info,
        ],
        borderColor: [
          CHART_COLORS.primary,
          CHART_COLORS.success,
          CHART_COLORS.warning,
          CHART_COLORS.info,
        ],
        borderWidth: 1,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Customers'
        }
      }
    }
  };

  return <Bar data={chartData} options={options} />;
};

// Stock Status Doughnut Chart
export const StockStatusChart = ({ data }) => {
  // Safety check for data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="text-muted">No stock status data available</p>
      </div>
    );
  }

  const inStock = data.filter(item => (item.stock_quantity || 0) > 10).length;
  const lowStock = data.filter(item => (item.stock_quantity || 0) > 0 && (item.stock_quantity || 0) <= 10).length;
  const outOfStock = data.filter(item => (item.stock_quantity || 0) === 0).length;

  const chartData = {
    labels: ['In Stock', 'Low Stock', 'Out of Stock'],
    datasets: [
      {
        data: [inStock, lowStock, outOfStock],
        backgroundColor: [
          CHART_COLORS.success,
          CHART_COLORS.warning,
          CHART_COLORS.danger,
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  return <Doughnut data={chartData} options={pieChartOptions} />;
};
