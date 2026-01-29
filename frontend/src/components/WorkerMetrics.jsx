import { useState } from 'react'

function WorkerMetrics({ metrics }) {
  const [selectedWorker, setSelectedWorker] = useState(null)

  if (!metrics || metrics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Worker Metrics</h2>
        <p className="text-gray-500">No worker data available</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Worker Performance</h2>

      {/* Worker Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {metrics.map((worker) => (
          <div
            key={worker.worker_id}
            onClick={() => setSelectedWorker(worker.worker_id === selectedWorker ? null : worker.worker_id)}
            className={`bg-white rounded-lg shadow-sm border-2 p-5 cursor-pointer transition-all ${
              selectedWorker === worker.worker_id
                ? 'border-blue-500 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{worker.name}</h3>
                <p className="text-sm text-gray-500">{worker.worker_id}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                worker.utilization_percentage >= 80
                  ? 'bg-green-100 text-green-800'
                  : worker.utilization_percentage >= 60
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {worker.utilization_percentage.toFixed(1)}% Util
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active Time:</span>
                <span className="font-semibold text-gray-900">
                  {(worker.total_active_time_minutes / 60).toFixed(1)} hrs
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Idle Time:</span>
                <span className="font-semibold text-gray-900">
                  {(worker.total_idle_time_minutes / 60).toFixed(1)} hrs
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Units Produced:</span>
                <span className="font-semibold text-blue-600">{worker.total_units_produced}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Units/Hour:</span>
                <span className="font-semibold text-gray-900">{worker.units_per_hour.toFixed(1)}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${worker.utilization_percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Worker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Idle Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Units
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.map((worker) => (
                <tr
                  key={worker.worker_id}
                  className={selectedWorker === worker.worker_id ? 'bg-blue-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                    <div className="text-sm text-gray-500">{worker.worker_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {worker.total_active_time_minutes.toFixed(1)} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {worker.total_idle_time_minutes.toFixed(1)} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      worker.utilization_percentage >= 80
                        ? 'bg-green-100 text-green-800'
                        : worker.utilization_percentage >= 60
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {worker.utilization_percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {worker.total_units_produced}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {worker.units_per_hour.toFixed(2)}/hr
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default WorkerMetrics
