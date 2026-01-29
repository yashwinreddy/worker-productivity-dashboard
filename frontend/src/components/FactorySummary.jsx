function FactorySummary({ metrics }) {
  if (!metrics) return null

  const stats = [
    {
      label: 'Total Production',
      value: metrics.total_production_count,
      unit: 'units',
      color: 'blue'
    },
    {
      label: 'Productive Time',
      value: `${(metrics.total_productive_time_minutes / 60).toFixed(1)}`,
      unit: 'hours',
      color: 'green'
    },
    {
      label: 'Avg Utilization',
      value: `${metrics.average_utilization_percentage.toFixed(1)}`,
      unit: '%',
      color: 'purple'
    },
    {
      label: 'Production Rate',
      value: metrics.average_production_rate.toFixed(1),
      unit: 'units/hr',
      color: 'orange'
    }
  ]

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200'
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Factory Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${colorClasses[stat.color]} border rounded-lg p-6 shadow-sm`}
          >
            <p className="text-sm font-medium opacity-80 mb-1">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm opacity-70">{stat.unit}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Active Workers:</span> {metrics.total_workers}
          </div>
          <div>
            <span className="font-medium">Active Workstations:</span> {metrics.total_workstations}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FactorySummary
