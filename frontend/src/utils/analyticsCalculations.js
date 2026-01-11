/**
 * Analytics Calculations Utility
 * Contains all metric calculations and data transformations for the analytics dashboard
 */

/**
 * Calculate productivity score from multiple metrics
 * Formula: (completion_rate * 0.4) + (focus_completion_rate * 0.3) + (on_time_rate * 0.3)
 */
export const calculateProductivityScore = (data) => {
  const {
    completion_rate = 0,      // 0-100 from /analytics/dashboard
    focus_completion_rate = 0, // 0-100 from /api/focus/stats
    on_time_rate = 0          // 0-100 from /analytics/productivity-metrics
  } = data;

  // Handle edge case of no data
  if (completion_rate === 0 && focus_completion_rate === 0 && on_time_rate === 0) {
    return 0;
  }

  // Weighted formula:
  // - Task completion: 40% (most important)
  // - Focus efficiency: 30% (work quality)
  // - On-time delivery: 30% (reliability)
  const score =
    (completion_rate * 0.4) +
    (focus_completion_rate * 0.3) +
    (on_time_rate * 0.3);

  return Math.round(score * 10) / 10; // 1 decimal place
};

/**
 * Get productivity level label and color based on score
 */
export const getProductivityLevel = (score) => {
  if (score >= 90) return { level: 'Excellent', color: '#06B6D4', icon: 'TrendingUp' };
  if (score >= 75) return { level: 'Good', color: '#7C3AED', icon: 'CheckCircle' };
  if (score >= 60) return { level: 'Fair', color: '#F59E0B', icon: 'Activity' };
  return { level: 'Needs Improvement', color: '#EF4444', icon: 'AlertTriangle' };
};

/**
 * Calculate average time per task from focus statistics
 */
export const calculateAverageTime = (focusStats) => {
  if (!focusStats) return 0;

  const { total_focus_time = 0, total_sessions = 0 } = focusStats;

  if (total_sessions === 0) return 0;

  const avgMinutes = total_focus_time / total_sessions;
  const avgHours = avgMinutes / 60;

  return Math.round(avgHours * 10) / 10; // 1 decimal place
};

/**
 * Transform heat map data for 30-day calendar view
 */
export const transformHeatMapData = (workloadData, days = 30) => {
  const data = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (days - 1 - i));

    const dayData = workloadData?.activity_by_day?.find(d =>
      new Date(d.date).toDateString() === date.toDateString()
    );

    data.push({
      date: date.toISOString().split('T')[0],
      week: Math.floor(i / 7),
      day: date.getDay(),
      value: dayData ? dayData.task_count : 0,
      hours: dayData ? dayData.total_hours : 0,
      displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  }

  return data;
};

/**
 * Transform weekly workload data for line chart
 */
export const transformWeeklyData = (workloadData) => {
  if (!workloadData?.workload_by_day) return [];

  return workloadData.workload_by_day.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    completed: day.completed || 0,
    pending: day.task_count - (day.completed || 0),
    hours: day.total_hours,
    tasks: day.task_count
  }));
};

/**
 * Transform donut chart data for task distribution
 */
export const transformDonutData = (dashboardData) => {
  if (!dashboardData) return [];

  return [
    { name: 'Todo', value: dashboardData.todo || 0, status: 'todo' },
    { name: 'In Progress', value: dashboardData.in_progress || 0, status: 'in_progress' },
    { name: 'Completed', value: dashboardData.completed || 0, status: 'completed' }
  ].filter(item => item.value > 0);
};

/**
 * Transform focus data for planned vs actual chart
 */
export const transformPlannedVsActual = (focusData) => {
  if (!focusData?.sessions) return [];

  // Group by task and calculate averages
  const taskGroups = {};

  focusData.sessions.forEach(session => {
    const taskName = session.task_title || 'Untitled Task';
    if (!taskGroups[taskName]) {
      taskGroups[taskName] = {
        planned: [],
        actual: []
      };
    }
    if (session.planned_duration_minutes) {
      taskGroups[taskName].planned.push(session.planned_duration_minutes / 60);
    }
    if (session.actual_duration_minutes) {
      taskGroups[taskName].actual.push(session.actual_duration_minutes / 60);
    }
  });

  // Convert to chart data format (top 5 tasks)
  return Object.entries(taskGroups)
    .map(([task, data]) => ({
      task: task.length > 20 ? task.substring(0, 20) + '...' : task,
      planned: data.planned.length > 0
        ? Math.round((data.planned.reduce((a, b) => a + b, 0) / data.planned.length) * 10) / 10
        : 0,
      actual: data.actual.length > 0
        ? Math.round((data.actual.reduce((a, b) => a + b, 0) / data.actual.length) * 10) / 10
        : 0
    }))
    .slice(0, 5);
};

/**
 * Transform status data for pie chart
 */
export const transformStatusData = (dashboardData) => {
  if (!dashboardData) return [];

  return [
    { name: 'Completed', value: dashboardData.completed || 0, color: '#10b981' },
    { name: 'In Progress', value: dashboardData.in_progress || 0, color: '#3b82f6' },
    { name: 'Todo', value: dashboardData.todo || 0, color: '#f59e0b' }
  ].filter(item => item.value > 0);
};

/**
 * Transform priority data for bar chart
 */
export const transformPriorityData = (dashboardData) => {
  if (!dashboardData?.priority_distribution) return [];

  return Object.entries(dashboardData.priority_distribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));
};

/**
 * Calculate trend percentage (for metric cards)
 */
export const calculateTrend = (current, previous) => {
  if (previous === 0) return 0;
  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 10) / 10;
};

/**
 * Get color intensity for heat map based on value
 */
export const getHeatMapColorIntensity = (value) => {
  if (value === 0) return '#1E293B';
  if (value <= 3) return '#7C3AED40'; // 25% opacity
  if (value <= 6) return '#7C3AED80'; // 50% opacity
  if (value <= 10) return '#7C3AEDC0'; // 75% opacity
  return '#7C3AED'; // Full intensity
};

/**
 * Format time display (hours to readable format)
 */
export const formatTimeDisplay = (hours) => {
  if (hours === 0) return '0 hrs';
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }
  if (hours < 10) {
    return `${hours.toFixed(1)} hrs`;
  }
  return `${Math.round(hours)} hrs`;
};

/**
 * Export CSV data formatter
 */
export const formatCSVData = (analyticsData) => {
  const rows = [
    ['Metric', 'Value'],
    ['Date', new Date().toLocaleDateString()],
    [''],
    ['Key Metrics', ''],
    ['Total Tasks', analyticsData.totalTasks || 0],
    ['Completion Rate', `${analyticsData.completionRate || 0}%`],
    ['Average Time Per Task', `${analyticsData.averageTime || 0} hours`],
    ['Productivity Score', analyticsData.productivityScore || 0],
    [''],
    ['Task Status Distribution', ''],
    ['Completed', analyticsData.completed || 0],
    ['In Progress', analyticsData.in_progress || 0],
    ['Todo', analyticsData.todo || 0],
    [''],
    ['Priority Distribution', ''],
  ];

  if (analyticsData.priority_distribution) {
    Object.entries(analyticsData.priority_distribution).forEach(([priority, count]) => {
      rows.push([priority.charAt(0).toUpperCase() + priority.slice(1), count]);
    });
  }

  return rows;
};
