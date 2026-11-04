import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { healthApi } from '../lib/api'
import { Activity, Database, Server, Zap } from 'lucide-react'

export const Route = createFileRoute('/health')({
    component: Health,
})

function Health() {
    const { data: health, isLoading, error } = useQuery({
        queryKey: ['health'],
        queryFn: () => healthApi.check().then(res => res.data),
        refetchInterval: 30000, // Refetch every 30 seconds
    })

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'healthy':
            case 'connected':
                return 'text-green-600'
            case 'disconnected':
            case 'unhealthy':
                return 'text-red-600'
            default:
                return 'text-yellow-600'
        }
    }

    const getStatusBg = (status: string) => {
        switch (status.toLowerCase()) {
            case 'healthy':
            case 'connected':
                return 'bg-green-100'
            case 'disconnected':
            case 'unhealthy':
                return 'bg-red-100'
            default:
                return 'bg-yellow-100'
        }
    }

    return (
        <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
                <p className="mt-2 text-gray-600">Monitor the status of application services</p>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card animate-pulse">
                            <div className="card-body">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="card border-red-200">
                    <div className="card-body">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Activity className="h-8 w-8 text-red-600" />
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-medium text-red-800">
                                    Unable to fetch health status
                                </h3>
                                <p className="text-red-600">
                                    The backend service appears to be unavailable.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Overall Status */}
                    <div className="mb-8">
                        <div className={`card border-2 ${health?.status === 'healthy' ? 'border-green-200' : 'border-red-200'
                            }`}>
                            <div className="card-body">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <Activity className={`h-8 w-8 ${getStatusColor(health?.status || 'unknown')}`} />
                                        </div>
                                        <div className="ml-4">
                                            <h2 className="text-xl font-semibold text-gray-900">
                                                Overall Status
                                            </h2>
                                            <p className={`text-lg font-medium ${getStatusColor(health?.status || 'unknown')}`}>
                                                {health?.status?.toUpperCase() || 'UNKNOWN'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Last checked</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {health?.timestamp
                                                ? new Date(health.timestamp).toLocaleString()
                                                : 'Unknown'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Service Status Grid */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {/* API Service */}
                        <div className="card">
                            <div className="card-body">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <Server className={`h-8 w-8 ${getStatusColor(health?.status || 'unknown')}`} />
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <h3 className="text-lg font-medium text-gray-900">API Service</h3>
                                        <div className="flex items-center mt-1">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${health?.status === 'healthy'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                {health?.status?.toUpperCase() || 'UNKNOWN'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Database */}
                        <div className="card">
                            <div className="card-body">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <Database className="h-8 w-8 text-blue-600" />
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <h3 className="text-lg font-medium text-gray-900">Database</h3>
                                        <div className="flex items-center mt-1">
                                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                CONNECTED
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Redis Cache */}
                        <div className="card">
                            <div className="card-body">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <Zap className={`h-8 w-8 ${getStatusColor(health?.redis || 'unknown')}`} />
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <h3 className="text-lg font-medium text-gray-900">Redis Cache</h3>
                                        <div className="flex items-center mt-1">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${health?.redis === 'connected'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                {health?.redis?.toUpperCase() || 'UNKNOWN'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* System Information */}
                    <div className="mt-8">
                        <div className="card">
                            <div className="card-header">
                                <h2 className="text-lg font-medium text-gray-900">System Information</h2>
                            </div>
                            <div className="card-body">
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Served by Pod</dt>
                                        <dd className="mt-1 text-sm font-mono text-gray-900">{health?.pod || 'unknown'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">API Version</dt>
                                        <dd className="mt-1 text-sm text-gray-900">2.0.0</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    </div>

                    {/* Health Check Actions */}
                    <div className="mt-8">
                        <div className="card">
                            <div className="card-header">
                                <h2 className="text-lg font-medium text-gray-900">Actions</h2>
                            </div>
                            <div className="card-body">
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="btn btn-secondary"
                                    >
                                        Refresh Status
                                    </button>
                                    <a
                                        href="/api/health"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary"
                                    >
                                        View Raw Response
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}