import { useState, useEffect } from 'react'
import FactorySummary from './components/FactorySummary'
import WorkerMetrics from './components/WorkerMetrics'
import WorkstationMetrics from './components/WorkstationMetrics'

const API_URL = 'https://urban-capybara-r5r99pjpvpx357qv-8000.app.github.dev'

function App() {
    const [factoryMetrics, setFactoryMetrics] = useState(null)
    const [workerMetrics, setWorkerMetrics] = useState([])
    const [workstationMetrics, setWorkstationMetrics] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedFilter, setSelectedFilter] = useState('all')

    useEffect(() => {
        fetchMetrics()
        // Refresh every 30 seconds
        const interval = setInterval(fetchMetrics, 30000)
        return () => clearInterval(interval)
    }, [])

    const fetchMetrics = async () => {
        try {
            setLoading(true)
            setError(null)

            const [factoryRes, workersRes, workstationsRes] = await Promise.all([
                fetch(`${API_URL}/api/metrics/factory`),
                fetch(`${API_URL}/api/metrics/workers`),
                fetch(`${API_URL}/api/metrics/workstations`)
            ])

            if (!factoryRes.ok || !workersRes.ok || !workstationsRes.ok) {
                throw new Error('Failed to fetch metrics')
            }

            const factory = await factoryRes.json()
            const workers = await workersRes.json()
            const workstations = await workstationsRes.json()

            setFactoryMetrics(factory)
            setWorkerMetrics(workers)
            setWorkstationMetrics(workstations)
        } catch (err) {
            setError(err.message)
            console.error('Error fetching metrics:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleRefreshData = async () => {
        try {
            const res = await fetch(`${API_URL}/api/seed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })

            if (res.ok) {
                alert('Data refreshed successfully!')
                fetchMetrics()
            }
        } catch (err) {
            alert('Failed to refresh data: ' + err.message)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
                    <h2 className="text-red-600 text-xl font-bold mb-4">Error Loading Dashboard</h2>
                    <p className="text-gray-700 mb-4">{error}</p>
                    <button
                        onClick={fetchMetrics}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Worker Productivity Dashboard
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Real-time AI-powered manufacturing insights
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={fetchMetrics}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                            <button
                                onClick={handleRefreshData}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                            >
                                Reseed Data
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Factory Summary */}
                <div className="mb-8">
                    <FactorySummary metrics={factoryMetrics} />
                </div>

                {/* Filter Tabs */}
                <div className="mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setSelectedFilter('all')}
                                className={`${selectedFilter === 'all'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition`}
                            >
                                All Metrics
                            </button>
                            <button
                                onClick={() => setSelectedFilter('workers')}
                                className={`${selectedFilter === 'workers'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition`}
                            >
                                Workers Only
                            </button>
                            <button
                                onClick={() => setSelectedFilter('workstations')}
                                className={`${selectedFilter === 'workstations'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition`}
                            >
                                Workstations Only
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Metrics Sections */}
                <div className="space-y-8">
                    {(selectedFilter === 'all' || selectedFilter === 'workers') && (
                        <WorkerMetrics metrics={workerMetrics} />
                    )}

                    {(selectedFilter === 'all' || selectedFilter === 'workstations') && (
                        <WorkstationMetrics metrics={workstationMetrics} />
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <p className="text-center text-sm text-gray-500">
                        Last updated: {new Date().toLocaleString()} • Auto-refresh: 30s
                    </p>
                </div>
            </footer>
        </div>
    )
}

export default App
