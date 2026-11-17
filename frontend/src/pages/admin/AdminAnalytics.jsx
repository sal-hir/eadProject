
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock3,
  Package,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  AlertCircle,
  BarChart3,
  Truck,
  PieChart,
  ShieldCheck,
  Zap,
  Download,
  ArrowUpRight,
} from "lucide-react";

import { analyticsApi } from "../../api/adminApi";

const COLORS = {
  primary: "#2563eb",
  secondary: "#3b82f6",
  light: "#60a5fa",
  success: "#16a34a",
  danger: "#ef4444",
  warning: "#f59e0b",
  neutral: "#64748b",
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString();

const formatPercentage = (value) =>
  `${Number(value || 0).toFixed(1)}%`;

const getPayload = (response) => {
  let data = response?.data ?? response;

  if (data?.data !== undefined) {
    data = data.data;
  }

  return data;
};

const getArray = (response, keys = []) => {
  const data = getPayload(response);

  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
};

const getDailyCount = (item) =>
  Number(
    item.count ??
    item.total ??
    item.totalDeliveries ??
    0
  );

const getDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const from = new Date();

  from.setDate(today.getDate() - 6);

  return {
    from: getDateString(from),
    to: getDateString(today),
  };
};

const STATUS_COLORS = {
  delivered: "#16a34a",
  successful: "#16a34a",
  completed: "#16a34a",
  failed: "#ef4444",
  cancelled: "#a855f7",
  pending: "#f59e0b",
  processing: "#3b82f6",
  assigned: "#0891b2",
  in_transit: "#06b6d4",
};

const getStatusColor = (status) => {
  const key = String(status || "")
    .toLowerCase()
    .replaceAll(" ", "_");

  return STATUS_COLORS[key] || "#64748b";
};

const AdminAnalytics = () => {
  const defaultDates = useMemo(() => getDefaultDates(), []);

  const [overview, setOverview] = useState({});
  const [dailyDeliveries, setDailyDeliveries] = useState([]);
  const [deliveryStatuses, setDeliveryStatuses] = useState([]);

  const [fromDate, setFromDate] = useState(defaultDates.from);
  const [toDate, setToDate] = useState(defaultDates.to);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async (isRefresh = false) => {
    if (fromDate > toDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [
        overviewResponse,
        dailyResponse,
        statusResponse,
      ] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getDailyDeliveries(fromDate, toDate),
        analyticsApi.getDeliveryStatus(),
      ]);

      setOverview(getPayload(overviewResponse) || {});

      setDailyDeliveries(
        getArray(dailyResponse, [
          "items",
          "deliveries",
          "dailyDeliveries",
        ])
      );

      setDeliveryStatuses(
        getArray(statusResponse, [
          "items",
          "statuses",
          "deliveryStatuses",
        ])
      );
    } catch (err) {
      console.error("Analytics error:", err);

      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load analytics. Check your server connection."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const total = Number(
    overview.total ??
    overview.totalDeliveries ??
    0
  );

  const successful = Number(
    overview.successful ??
    overview.completed ??
    overview.successfulDeliveries ??
    0
  );

  const failed = Number(
    overview.failed ??
    overview.failedDeliveries ??
    0
  );

  const pending = Number(
    overview.pending ??
    overview.pendingDeliveries ??
    0
  );

  const successRate =
    overview.successRate !== undefined
      ? Number(overview.successRate)
      : total > 0
        ? (successful / total) * 100
        : 0;

  const failureRate =
    overview.failureRate !== undefined
      ? Number(overview.failureRate)
      : total > 0
        ? (failed / total) * 100
        : 0;

  const maxDailyCount = Math.max(
    1,
    ...dailyDeliveries.map(getDailyCount)
  );

  const totalDailyVolume = dailyDeliveries.reduce(
    (sum, item) => sum + getDailyCount(item),
    0
  );

  const averageDailyVolume =
    dailyDeliveries.length > 0
      ? (totalDailyVolume / dailyDeliveries.length).toFixed(1)
      : "0.0";

  const exportCSV = () => {
    const rows = [
      ["Date", "Deliveries"],
      ...dailyDeliveries.map((item) => [
        item.date || item.day || "",
        getDailyCount(item),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replaceAll('"', '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      `delivery-analytics-${fromDate}-to-${toDate}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <>
        <div className="analytics-loading">
          <RefreshCw size={34} className="spin" />
          <h3>Loading Analytics</h3>
          <p>Preparing your delivery statistics...</p>
        </div>
        <style>{styles}</style>
      </>
    );
  }

  return (
    <div className="analytics-dashboard">
      <style>{styles}</style>

      {/* HEADER */}

      <header className="analytics-header">
        <div className="analytics-heading">
          <div className="heading-icon">
            <BarChart3 size={25} />
          </div>

          <div>
            <h1>Delivery Analytics</h1>
            <p>
              Monitor your delivery operations and business performance.
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={exportCSV}
            disabled={!dailyDeliveries.length}
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            className="btn btn-primary"
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={refreshing ? "spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {/* DATE FILTER */}

      <section className="filter-card">
        <div className="filter-heading">
          <div className="filter-icon">
            <CalendarDays size={20} />
          </div>

          <div>
            <h3>Analytics Period</h3>
            <p>Select your reporting date range</p>
          </div>
        </div>

        <div className="date-controls">
          <label>
            <span>From Date</span>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>

          <label>
            <span>To Date</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>

          <button
            className="btn btn-primary"
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
          >
            Apply Filter
          </button>
        </div>
      </section>

      {/* ERROR */}

      {error && (
        <div className="error-message">
          <AlertCircle size={19} />
          <span>{error}</span>

          <button onClick={() => loadAnalytics(true)}>
            Retry
          </button>
        </div>
      )}

      {/* KPI CARDS */}

      <section className="stats-grid">

        <StatCard
          title="Total Deliveries"
          value={formatNumber(total)}
          subtitle="All recorded deliveries"
          icon={<Package size={24} />}
          color="#2563eb"
          background="#eff6ff"
        />

        <StatCard
          title="Successful Deliveries"
          value={formatNumber(successful)}
          subtitle="Successfully completed"
          icon={<CheckCircle2 size={24} />}
          color="#16a34a"
          background="#ecfdf5"
          badge={`${formatPercentage(successRate)} success rate`}
        />

        <StatCard
          title="Failed Deliveries"
          value={formatNumber(failed)}
          subtitle="Unsuccessful deliveries"
          icon={<XCircle size={24} />}
          color="#ef4444"
          background="#fef2f2"
          badge={`${formatPercentage(failureRate)} failure rate`}
        />

        <StatCard
          title="Pending Deliveries"
          value={formatNumber(pending)}
          subtitle="Awaiting completion"
          icon={<Clock3 size={24} />}
          color="#f59e0b"
          background="#fffbeb"
          badge="In progress"
        />

      </section>

      {/* PERFORMANCE */}

      <SectionHeading
        title="Delivery Performance"
        subtitle="Overview of your delivery success and failure rates."
      />

      <section className="performance-grid">

        <PerformanceCard
          title="Successful Deliveries"
          value={successRate}
          count={successful}
          total={total}
          color="#16a34a"
          icon={<TrendingUp size={21} />}
        />

        <PerformanceCard
          title="Failed Deliveries"
          value={failureRate}
          count={failed}
          total={total}
          color="#ef4444"
          icon={<TrendingDown size={21} />}
        />

      </section>

      {/* CHARTS */}

      <SectionHeading
        title="Analytics Overview"
        subtitle="Visualize daily delivery activity and operational distribution."
      />

      <section className="charts-grid">

        {/* DAILY BAR CHART */}

        <div className="chart-card daily-chart-card">

          <div className="chart-header">
            <div>
              <h3>Daily Deliveries Trend</h3>
              <p>Daily delivery volume over time</p>
            </div>

            <div className="chart-icon blue">
              <Activity size={21} />
            </div>
          </div>

          <div className="chart-summary">
            <div>
              <span>Total Volume</span>
              <strong>{formatNumber(totalDailyVolume)}</strong>
            </div>

            <div>
              <span>Daily Average</span>
              <strong>{averageDailyVolume}</strong>
            </div>
          </div>

          {dailyDeliveries.length === 0 ? (
            <EmptyState message="No daily delivery data available." />
          ) : (
            <div className="large-bar-chart">

              <div className="chart-y-labels">
                <span>{maxDailyCount}</span>
                <span>{Math.round(maxDailyCount * 0.75)}</span>
                <span>{Math.round(maxDailyCount * 0.5)}</span>
                <span>{Math.round(maxDailyCount * 0.25)}</span>
                <span>0</span>
              </div>

              <div className="chart-plot">

                <div className="chart-grid-lines">
                  {[0, 1, 2, 3, 4].map((item) => (
                    <div key={item} />
                  ))}
                </div>

                <div className="bars-container">

                  {dailyDeliveries.map((item, index) => {
                    const count = getDailyCount(item);

                    const height = Math.max(
                      count > 0 ? 3 : 0,
                      (count / maxDailyCount) * 100
                    );

                    const dateLabel = item.date
                      ? new Date(
                          `${item.date}T00:00:00`
                        ).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                        })
                      : item.day || `Day ${index + 1}`;

                    return (
                      <div
                        className="bar-column"
                        key={item.date || index}
                      >
                        <div className="bar-tooltip">
                          {formatNumber(count)}
                        </div>

                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              "--bar-height": `${height}%`,
                              animationDelay: `${index * 90}ms`,
                            }}
                            title={`${dateLabel}: ${count} deliveries`}
                          />
                        </div>

                        <span className="bar-label">
                          {dateLabel}
                        </span>
                      </div>
                    );
                  })}

                </div>
              </div>
            </div>
          )}
        </div>

        {/* DONUT CHART */}

        <div className="chart-card status-chart-card">

          <div className="chart-header">
            <div>
              <h3>Status Distribution</h3>
              <p>Delivery status breakdown</p>
            </div>

            <div className="chart-icon purple">
              <PieChart size={21} />
            </div>
          </div>

          {deliveryStatuses.length === 0 ? (
            <EmptyState message="No status data available." />
          ) : (
            <StatusDonut
              statuses={deliveryStatuses}
              total={total}
            />
          )}

        </div>

      </section>

      {/* QUICK INSIGHTS */}

      <SectionHeading
        title="Operational Insights"
        subtitle="Key indicators from your delivery operations."
      />

      <section className="insights-grid">

        <InsightCard
          icon={<Zap size={21} />}
          title="Daily Average Volume"
          value={`${averageDailyVolume} deliveries / day`}
          color="#2563eb"
        />

        <InsightCard
          icon={<ShieldCheck size={21} />}
          title="Operational Health"
          value={
            successRate >= 90
              ? "Excellent Performance"
              : successRate >= 75
                ? "Stable Operations"
                : "Needs Review"
          }
          color="#16a34a"
        />

        <InsightCard
          icon={<Truck size={21} />}
          title="Active Period"
          value={`${fromDate} to ${toDate}`}
          color="#8b5cf6"
        />

      </section>

      {/* SUMMARY TABLE */}

      <div className="chart-card summary-card">

        <div className="chart-header">
          <div>
            <h3>Daily Delivery Summary</h3>
            <p>Detailed delivery statistics for each date</p>
          </div>

          <span className="record-badge">
            {dailyDeliveries.length} Records
          </span>
        </div>

        {dailyDeliveries.length === 0 ? (
          <EmptyState message="No delivery records found." />
        ) : (
          <div className="table-scroll">
            <table className="analytics-table">

              <thead>
                <tr>
                  <th>Date</th>
                  <th>Deliveries</th>
                  <th>Activity Distribution</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {dailyDeliveries.map((item, index) => {
                  const count = getDailyCount(item);
                  const percentage =
                    (count / maxDailyCount) * 100;

                  return (
                    <tr key={item.date || index}>
                      <td>
                        <strong>
                          {item.date || item.day || "Unknown"}
                        </strong>
                      </td>

                      <td>
                        <span className="delivery-number">
                          {formatNumber(count)}
                        </span>
                      </td>

                      <td>
                        <div className="table-progress">
                          <div
                            className="table-progress-fill"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </td>

                      <td>
                        <span className="activity-badge">
                          <span />
                          Recorded
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        )}
      </div>

      {/* FOOTER */}

      <footer className="analytics-footer">
        <Activity size={16} />
        Analytics powered by SwiftDrop delivery data.
      </footer>

    </div>
  );
};

/* KPI CARD */

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  color,
  background,
  badge,
}) => (
  <div className="stat-card">

    <div className="stat-top">
      <div>
        <p className="stat-title">{title}</p>
        <h2>{value}</h2>
      </div>

      <div
        className="stat-icon"
        style={{
          color,
          backgroundColor: background,
        }}
      >
        {icon}
      </div>
    </div>

    <div className="stat-bottom">
      <span>{subtitle}</span>

      {badge && (
        <span className="stat-badge">
          {badge}
        </span>
      )}
    </div>
  </div>
);

/* SECTION HEADING */

const SectionHeading = ({ title, subtitle }) => (
  <div className="section-heading">
    <div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
    <ArrowUpRight size={19} />
  </div>
);

/* PERFORMANCE CARD */

const PerformanceCard = ({
  title,
  value,
  count,
  total,
  color,
  icon,
}) => (
  <div className="performance-card">

    <div className="performance-header">
      <div
        className="performance-icon"
        style={{
          color,
          backgroundColor: `${color}15`,
        }}
      >
        {icon}
      </div>

      <span>{title}</span>
    </div>

    <div
      className="performance-value"
      style={{ color }}
    >
      {formatPercentage(value)}
    </div>

    <div className="performance-track">
      <div
        className="performance-fill"
        style={{
          "--progress": `${Math.min(
            100,
            Math.max(0, value)
          )}%`,
          backgroundColor: color,
        }}
      />
    </div>

    <p>
      {formatNumber(count)} out of {formatNumber(total)} deliveries
    </p>

  </div>
);

/* STATUS DONUT */

const StatusDonut = ({ statuses, total }) => {
  const circumference = 2 * Math.PI * 43;

  let accumulated = 0;

  const segments = statuses
    .map((item, index) => {
      const count = Number(
        item.count ??
        item.total ??
        item.totalDeliveries ??
        0
      );

      const percentage =
        item.percentage !== undefined
          ? Number(item.percentage)
          : total > 0
            ? (count / total) * 100
            : 0;

      const segment = {
        ...item,
        count,
        percentage: Math.max(0, percentage),
        offset: accumulated,
        color: getStatusColor(item.status),
        key: item.status || index,
      };

      accumulated +=
        (segment.percentage / 100) * circumference;

      return segment;
    })
    .filter((item) => item.percentage > 0);

  return (
    <div className="donut-content">

      <div className="donut-wrapper">

        <svg
          viewBox="0 0 120 120"
          className="donut-svg"
        >
          <circle
            cx="60"
            cy="60"
            r="43"
            fill="none"
            stroke="#eff3f9"
            strokeWidth="15"
          />

          {segments.map((item, index) => {
            const length =
              (item.percentage / 100) * circumference;

            return (
              <circle
                key={item.key}
                cx="60"
                cy="60"
                r="43"
                fill="none"
                stroke={item.color}
                strokeWidth="15"
                strokeDasharray={`${length} ${
                  circumference - length
                }`}
                strokeDashoffset={-item.offset}
                strokeLinecap="butt"
                className="donut-segment"
                style={{
                  animationDelay: `${index * 180}ms`,
                }}
              />
            );
          })}
        </svg>

        <div className="donut-center">
          <strong>{formatNumber(total)}</strong>
          <span>Total Deliveries</span>
        </div>

      </div>

      <div className="donut-legend">

        {segments.map((item) => (
          <div
            className="legend-row"
            key={item.key}
          >
            <div className="legend-name">
              <span
                className="legend-dot"
                style={{
                  backgroundColor: item.color,
                }}
              />

              <span>
                {String(item.status || "Unknown")
                  .replaceAll("_", " ")
                  .replace(/\b\w/g, (letter) =>
                    letter.toUpperCase()
                  )}
              </span>
            </div>

            <div className="legend-values">
              <strong>{formatNumber(item.count)}</strong>
              <span>
                {formatPercentage(item.percentage)}
              </span>
            </div>
          </div>
        ))}

      </div>
    </div>
  );
};

/* INSIGHT CARD */

const InsightCard = ({
  icon,
  title,
  value,
  color,
}) => (
  <div className="insight-card">

    <div
      className="insight-icon"
      style={{
        color,
        backgroundColor: `${color}15`,
      }}
    >
      {icon}
    </div>

    <div>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>

  </div>
);

/* EMPTY STATE */

const EmptyState = ({ message }) => (
  <div className="empty-state">
    <BarChart3 size={35} />
    <p>{message}</p>
  </div>
);

/* CSS */

const styles = `

.analytics-dashboard {
  width: 100%;
  min-height: 100vh;
  padding: 28px;
  background: #f5f8ff;
  color: #172554;
  font-family: inherit;
  box-sizing: border-box;
}

.analytics-dashboard * {
  box-sizing: border-box;
}

/* HEADER */

.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}

.analytics-heading {
  display: flex;
  align-items: center;
  gap: 15px;
}

.heading-icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  background: #dbeafe;
  color: #2563eb;
  border-radius: 15px;
}

.analytics-heading h1 {
  font-size: 27px;
  font-weight: 800;
  margin: 0;
  color: #172554;
  letter-spacing: -0.6px;
}

.analytics-heading p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 10px;
}

/* BUTTONS */

.btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 11px 17px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all .2s ease;
}

.btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.btn-primary {
  color: white;
  background: #2563eb;
  box-shadow: 0 3px 8px #2563eb25;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.btn-secondary {
  background: white;
  color: #334155;
  border-color: #dce5f2;
}

.btn-secondary:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #93c5fd;
}

/* FILTER */

.filter-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 19px 22px;
  background: white;
  border: 1px solid #e3ebf7;
  border-radius: 14px;
  margin-bottom: 26px;
  box-shadow: 0 3px 12px #1e40af06;
}

.filter-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  color: #2563eb;
  background: #eff6ff;
}

.filter-heading h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 750;
}

.filter-heading p {
  margin: 4px 0 0;
  font-size: 11px;
  color: #94a3b8;
}

.date-controls {
  display: flex;
  align-items: end;
  gap: 12px;
  flex-wrap: wrap;
}

.date-controls label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-controls label span {
  font-size: 11px;
  color: #64748b;
  font-weight: 650;
}

.date-controls input {
  min-width: 150px;
  padding: 10px;
  border: 1px solid #dbe5f2;
  border-radius: 8px;
  outline: none;
  background: #fff;
  color: #334155;
}

.date-controls input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px #3b82f61a;
}

/* ERROR */

.error-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  margin-bottom: 20px;
  border-radius: 10px;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  font-size: 13px;
}

.error-message button {
  margin-left: auto;
  border: none;
  color: #dc2626;
  background: transparent;
  font-weight: 700;
  cursor: pointer;
}

/* KPI */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 17px;
  margin-bottom: 32px;
}

.stat-card {
  padding: 21px;
  background: white;
  border: 1px solid #e5ecf7;
  border-radius: 14px;
  box-shadow: 0 3px 12px #1e40af06;
  transition: transform .25s, box-shadow .25s;
  animation: cardAppear .5s ease both;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 25px #1e40af12;
}

.stat-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.stat-title {
  margin: 0 0 11px;
  color: #64748b;
  font-size: 12px;
  font-weight: 650;
}

.stat-card h2 {
  font-size: 30px;
  margin: 0;
  font-weight: 800;
  color: #172554;
  letter-spacing: -.7px;
}

.stat-icon {
  width: 47px;
  height: 47px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 13px;
}

.stat-bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin-top: 19px;
  font-size: 10px;
  color: #94a3b8;
}

.stat-badge {
  padding: 4px 8px;
  border-radius: 20px;
  color: #2563eb;
  background: #eff6ff;
  font-size: 10px;
  font-weight: 700;
}

/* SECTION */

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 30px 0 16px;
  color: #2563eb;
}

.section-heading h2 {
  color: #172554;
  font-size: 18px;
  font-weight: 800;
  margin: 0;
}

.section-heading p {
  color: #94a3b8;
  font-size: 12px;
  margin: 5px 0 0;
}

/* PERFORMANCE */

.performance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.performance-card {
  padding: 22px;
  border: 1px solid #e5ecf7;
  border-radius: 14px;
  background: white;
  box-shadow: 0 3px 12px #1e40af06;
}

.performance-header {
  display: flex;
  align-items: center;
  gap: 11px;
  color: #64748b;
  font-size: 13px;
  font-weight: 650;
}

.performance-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 11px;
}

.performance-value {
  font-size: 34px;
  font-weight: 800;
  margin: 17px 0;
}

.performance-track {
  width: 100%;
  height: 10px;
  background: #edf2f9;
  border-radius: 20px;
  overflow: hidden;
}

.performance-fill {
  height: 100%;
  width: var(--progress);
  border-radius: inherit;
  animation: progressAppear 1.1s ease both;
}

.performance-card > p {
  margin: 12px 0 0;
  font-size: 11px;
  color: #94a3b8;
}

/* CHART GRID */

.charts-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 19px;
}

.chart-card {
  min-width: 0;
  padding: 24px;
  border: 1px solid #e5ecf7;
  border-radius: 15px;
  background: white;
  box-shadow: 0 3px 14px #1e40af08;
  transition: box-shadow .25s;
}

.chart-card:hover {
  box-shadow: 0 9px 24px #1e40af10;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.chart-header h3 {
  font-size: 15px;
  font-weight: 800;
  color: #172554;
  margin: 0;
}

.chart-header p {
  margin: 5px 0 0;
  font-size: 11px;
  color: #94a3b8;
}

.chart-icon {
  width: 41px;
  height: 41px;
  display: grid;
  place-items: center;
  border-radius: 11px;
}

.chart-icon.blue {
  color: #2563eb;
  background: #eff6ff;
}

.chart-icon.purple {
  color: #7c3aed;
  background: #f5f3ff;
}

/* CHART SUMMARY */

.chart-summary {
  display: flex;
  gap: 35px;
  margin: 20px 0 25px;
}

.chart-summary div {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.chart-summary span {
  color: #94a3b8;
  font-size: 11px;
}

.chart-summary strong {
  font-size: 21px;
  font-weight: 800;
  color: #1e40af;
}

/* BIG BAR CHART */

.large-bar-chart {
  display: flex;
  height: 310px;
  gap: 12px;
  padding-top: 10px;
}

.chart-y-labels {
  width: 38px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-bottom: 31px;
  text-align: right;
  color: #94a3b8;
  font-size: 10px;
}

.chart-plot {
  flex: 1;
  min-width: 0;
  position: relative;
}

.chart-grid-lines {
  position: absolute;
  inset: 0 0 31px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.chart-grid-lines div {
  border-top: 1px dashed #e5edf8;
  width: 100%;
}

.bars-container {
  position: relative;
  height: 100%;
  display: flex;
  align-items: stretch;
  gap: 12px;
  overflow-x: auto;
  padding: 0 5px;
}

.bar-column {
  min-width: 35px;
  flex: 1;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}

.bar-tooltip {
  font-size: 10px;
  color: #2563eb;
  font-weight: 800;
  margin-bottom: 7px;
  opacity: 0;
  transition: opacity .2s;
}

.bar-column:hover .bar-tooltip {
  opacity: 1;
}

.bar-track {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.bar-fill {
  width: min(36px, 85%);
  height: var(--bar-height);
  min-height: 0;
  border-radius: 7px 7px 2px 2px;
  background: linear-gradient(
    180deg,
    #60a5fa 0%,
    #3b82f6 45%,
    #1d4ed8 100%
  );
  transform-origin: bottom;
  animation: barGrow .9s cubic-bezier(.2,.8,.2,1) both;
  transition: filter .2s, box-shadow .2s;
  box-shadow: 0 4px 10px #2563eb25;
}

.bar-column:hover .bar-fill {
  filter: brightness(1.1);
  box-shadow: 0 0 16px #3b82f660;
}

.bar-label {
  height: 31px;
  padding-top: 10px;
  font-size: 10px;
  white-space: nowrap;
  color: #64748b;
}

/* DONUT */

.donut-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 25px;
}

.donut-wrapper {
  position: relative;
  width: 225px;
  height: 225px;
  flex-shrink: 0;
}

.donut-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  overflow: visible;
}

.donut-segment {
  animation: donutReveal 1s ease both;
  transform-origin: center;
  transition: stroke-width .2s;
}

.donut-segment:hover {
  stroke-width: 18px;
}

.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  pointer-events: none;
}

.donut-center strong {
  font-size: 27px;
  color: #172554;
  font-weight: 800;
}

.donut-center span {
  margin-top: 5px;
  font-size: 10px;
  color: #94a3b8;
}

.donut-legend {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-height: 190px;
  overflow-y: auto;
  padding-right: 5px;
}

.legend-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.legend-name {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-values {
  display: flex;
  gap: 13px;
  font-size: 11px;
  align-items: center;
}

.legend-values strong {
  color: #172554;
}

.legend-values span {
  color: #94a3b8;
  min-width: 43px;
  text-align: right;
}

/* INSIGHTS */

.insights-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.insight-card {
  display: flex;
  align-items: center;
  gap: 13px;
  background: white;
  border: 1px solid #e5ecf7;
  border-radius: 13px;
  padding: 18px;
  transition: transform .2s;
}

.insight-card:hover {
  transform: translateY(-3px);
}

.insight-icon {
  width: 43px;
  height: 43px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 11px;
}

.insight-card span {
  display: block;
  color: #94a3b8;
  font-size: 11px;
  margin-bottom: 5px;
}

.insight-card strong {
  color: #172554;
  font-size: 13px;
  font-weight: 750;
}

/* TABLE */

.summary-card {
  margin-top: 28px;
}

.record-badge {
  color: #2563eb;
  background: #eff6ff;
  padding: 7px 11px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 750;
  white-space: nowrap;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.analytics-table {
  width: 100%;
  min-width: 500px;
  border-collapse: collapse;
  text-align: left;
}

.analytics-table th {
  padding: 14px;
  color: #64748b;
  background: #f8faff;
  font-size: 11px;
  font-weight: 750;
}

.analytics-table td {
  padding: 16px 14px;
  border-bottom: 1px solid #edf2f9;
  color: #475569;
  font-size: 12px;
}

.analytics-table td strong {
  color: #172554;
}

.delivery-number {
  color: #2563eb;
  font-weight: 800;
}

.table-progress {
  height: 8px;
  width: 100%;
  max-width: 180px;
  background: #eff3f9;
  border-radius: 20px;
  overflow: hidden;
}

.table-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #60a5fa, #2563eb);
}

.activity-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #16a34a;
  background: #ecfdf5;
  padding: 6px 9px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
}

.activity-badge span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #16a34a;
}

/* EMPTY STATE */

.empty-state {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #93a4bd;
  gap: 12px;
}

.empty-state p {
  font-size: 12px;
}

/* FOOTER */

.analytics-footer {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #94a3b8;
  font-size: 11px;
  margin-top: 22px;
  padding: 10px 0;
}

/* LOADING */

.analytics-loading {
  min-height: 65vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  gap: 10px;
}

.analytics-loading h3 {
  margin: 5px 0 0;
  color: #172554;
}

.analytics-loading p {
  color: #94a3b8;
  font-size: 13px;
}

.spin {
  animation: spin 1s linear infinite;
}

/* ANIMATIONS */

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes barGrow {
  from {
    transform: scaleY(0);
    opacity: .3;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

@keyframes donutReveal {
  from {
    opacity: 0;
    stroke-dasharray: 0 1000;
  }
  to {
    opacity: 1;
  }
}

@keyframes progressAppear {
  from {
    width: 0;
  }
  to {
    width: var(--progress);
  }
}

@keyframes cardAppear {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* RESPONSIVE */

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .donut-content {
    flex-direction: row;
    justify-content: center;
    align-items: center;
  }

  .donut-wrapper {
    width: 190px;
    height: 190px;
  }

  .donut-legend {
    max-width: 330px;
  }
}

@media (max-width: 750px) {
  .analytics-dashboard {
    padding: 16px;
  }

  .analytics-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions button {
    flex: 1;
  }

  .filter-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .date-controls {
    width: 100%;
  }

  .date-controls label {
    flex: 1;
    min-width: 120px;
  }

  .date-controls input {
    width: 100%;
    min-width: 0;
  }

  .date-controls button {
    width: 100%;
  }

  .performance-grid {
    grid-template-columns: 1fr;
  }

  .insights-grid {
    grid-template-columns: 1fr;
  }

  .donut-content {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .analytics-heading h1 {
    font-size: 21px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .stat-card h2 {
    font-size: 26px;
  }

  .chart-card {
    padding: 16px;
  }

  .large-bar-chart {
    height: 260px;
  }

  .bars-container {
    gap: 9px;
  }

  .donut-wrapper {
    width: 190px;
    height: 190px;
  }

  .chart-summary {
    gap: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .analytics-dashboard *,
  .analytics-dashboard *::before,
  .analytics-dashboard *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}

`;

export default AdminAnalytics;
