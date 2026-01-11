/**
 * Chart Helpers Utility
 * Contains chart styling, colors, and formatting helpers
 */

/**
 * Dark theme chart colors
 */
export const CHART_COLORS = {
  // Status colors
  status: {
    completed: '#10b981',    // Green
    in_progress: '#3b82f6',  // Blue
    todo: '#f59e0b'          // Amber
  },

  // Priority colors
  priority: {
    Low: '#10b981',      // Green
    Medium: '#f59e0b',   // Amber
    High: '#f97316',     // Orange
    Urgent: '#ef4444'    // Red
  },

  // Donut chart colors (purple/blue/cyan/pink)
  donut: {
    todo: '#7C3AED',        // Purple
    in_progress: '#3B82F6', // Blue
    completed: '#06B6D4',   // Cyan
    urgent: '#EC4899'       // Pink
  },

  // Gradient colors
  gradients: {
    purple: '#7C3AED',
    blue: '#3B82F6',
    cyan: '#06B6D4',
    pink: '#EC4899',
    green: '#10b981',
    amber: '#f59e0b'
  },

  // Chart infrastructure
  grid: '#334155',       // Slate
  axis: '#94A3B8',       // Light gray
  background: '#1E293B', // Dark slate
  text: '#F8FAFC'        // White
};

/**
 * Common tooltip style for dark theme
 */
export const DARK_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#1E293B',
    border: '1px solid #475569',
    borderRadius: '8px',
    color: '#F8FAFC',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
  },
  itemStyle: {
    color: '#F8FAFC'
  },
  labelStyle: {
    color: '#F8FAFC',
    fontWeight: '600'
  },
  cursor: { fill: '#334155', opacity: 0.3 }
};

/**
 * Common legend style for dark theme
 */
export const DARK_LEGEND_STYLE = {
  wrapperStyle: {
    color: '#F8FAFC',
    fontSize: '12px',
    paddingTop: '10px'
  },
  iconType: 'circle'
};

/**
 * Common axis style for dark theme
 */
export const DARK_AXIS_STYLE = {
  stroke: '#94A3B8',
  style: { fontSize: '12px', fill: '#94A3B8' }
};

/**
 * Common grid style for dark theme
 */
export const DARK_GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: '#334155',
  opacity: 0.5
};

/**
 * Format label for pie chart
 */
export const formatPieChartLabel = (entry) => {
  return `${entry.name}: ${entry.value}`;
};

/**
 * Format label with percentage for donut chart
 */
export const formatDonutLabel = ({ name, percent }) => {
  return `${name} ${(percent * 100).toFixed(0)}%`;
};

/**
 * Custom tooltip formatter for time-based charts
 */
export const TimeTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div style={DARK_TOOLTIP_STYLE.contentStyle}>
      <p style={{ fontWeight: '600', marginBottom: '8px' }}>{label}</p>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color, fontSize: '14px', margin: '4px 0' }}>
          {entry.name}: {entry.value.toFixed(1)} {entry.name.includes('Hours') ? 'hrs' : 'tasks'}
        </p>
      ))}
    </div>
  );
};

/**
 * Custom tooltip for heat map
 */
export const HeatMapTooltip = ({ date, value, hours }) => {
  return (
    <div style={{
      ...DARK_TOOLTIP_STYLE.contentStyle,
      padding: '8px 12px',
      fontSize: '12px'
    }}>
      <p style={{ fontWeight: '600', marginBottom: '4px' }}>{date}</p>
      <p style={{ color: '#7C3AED' }}>{value} tasks</p>
      {hours > 0 && <p style={{ color: '#3B82F6' }}>{hours.toFixed(1)} hours</p>}
    </div>
  );
};

/**
 * Get priority color by name
 */
export const getPriorityColor = (priority) => {
  return CHART_COLORS.priority[priority] || CHART_COLORS.gradients.purple;
};

/**
 * Get status color by name
 */
export const getStatusColor = (status) => {
  return CHART_COLORS.status[status] || CHART_COLORS.gradients.purple;
};

/**
 * Responsive chart container props
 */
export const RESPONSIVE_CHART_PROPS = {
  width: '100%',
  height: 300,
  margin: { top: 5, right: 30, left: 20, bottom: 5 }
};

/**
 * Purple gradient definition for area charts
 */
export const PURPLE_GRADIENT_DEF = (
  <defs>
    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
    </linearGradient>
  </defs>
);

/**
 * Blue gradient definition
 */
export const BLUE_GRADIENT_DEF = (
  <defs>
    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
    </linearGradient>
  </defs>
);

/**
 * Format Y-axis labels for hour-based charts
 */
export const formatHourAxis = (value) => {
  return `${value}h`;
};

/**
 * Format X-axis date labels
 */
export const formatDateAxis = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Get bar radius (rounded top corners)
 */
export const BAR_RADIUS = [8, 8, 0, 0];

/**
 * Get horizontal bar radius (rounded right corners)
 */
export const HORIZONTAL_BAR_RADIUS = [0, 8, 8, 0];

/**
 * Empty chart message style
 */
export const EMPTY_CHART_STYLE = {
  container: 'flex items-center justify-center h-64 text-slate-400',
  text: 'text-center',
  icon: 'mx-auto mb-2 text-slate-500',
  message: 'text-sm'
};
