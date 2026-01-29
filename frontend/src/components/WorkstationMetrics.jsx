import { useState } from 'react'

function WorkstationMetrics({ metrics }) {
  const [selectedStation, setSelectedStation] = useState(null)

  if (!metrics || metrics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Workstation Metrics</h2>
        <p className="text-gray-500">No workstation data available</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Workstation Performance</h2>

      {/* Workstation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {metrics.map((station) => (
          <div
            key={station.station_id}
            onClick={() => setSelectedStation(station.station_id === selectedStation ? null : station.station_id)}
            className={`bg-white rounded-lg shadow-sm border-2 p-5 cursor-pointer transition-all ${
              selectedStation === station.station_id
                ? 'border-purple-500 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{station.name}</h3>
                <p className="text-sm text-gray-500">{station.station_id}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                station.utilization_percentage >= 80
                  ? 'bg-green-100 text-green-800'
                  : station.utilization_percentage >= 60
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {station.utilization_percentage.toFixed(1)}% Util
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Occupancy:</span>
                <span className="font-semibold text-gray-900">
                  {(station.occupancy_time_minutes / 60).toFixed(1)} hrs
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Units Produced:</span>
                <span className="font-semibold text-purple-600">{station.total_units_produced}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Throughput:</span>
                <span className="font-semibold text-gray-900">{station.throughput_rate.toFixed(1)}/hr</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 transition-all"
                  style={{ width: `${station.utilization_percentage}%` }}
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
                  Workstation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Occupancy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Units
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Throughput
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.map((station) => (
                <tr
                  key={station.station_id}
                  className={selectedStation === station.station_id ? 'bg-purple-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{station.name}</div>
                    <div className="text-sm text-gray-500">{station.station_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {station.occupancy_time_minutes.toFixed(1)} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      station.utilization_percentage >= 80
                        ? 'bg-green-100 text-green-800'
                        : station.utilization_percentage >= 60
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {station.utilization_percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                    {station.total_units_produced}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {station.throughput_rate.toFixed(2)}/hr
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

export default WorkstationMetrics
