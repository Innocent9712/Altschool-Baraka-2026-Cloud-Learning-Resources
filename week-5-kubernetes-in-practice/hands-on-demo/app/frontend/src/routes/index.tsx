import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi, userApi, postApi } from '../lib/api'
import { Users, FileText, Activity, TrendingUp } from 'lucide-react'

export const Route = createFileRoute('/')({
    component: Dashboard,
})

function Dashboard() {
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['analytics', 'stats'],
        queryFn: () => analyticsApi.getStats().then(res => res.data),
    })

    const { data: recentUsers } = useQuery({
        queryKey: ['users', 'recent'],
        queryFn: () => userApi.getUsers({ limit: 5 }).then(res => res.data),
    })

    const { data: recentPosts } = useQuery({
        queryKey: ['posts', 'recent'],
        queryFn: () => postApi.getPosts({ limit: 5 }).then(res => res.data),
    })

    if (statsLoading) {
        return (
            <div className="px-4 py-6 sm:px-0">
                <div className="animate-pulse">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="card">
                                <div className="card-body">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-2 text-gray-600">Welcome to the Demo App dashboard</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                <div className="card">
                    <div className="card-body">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Users className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Users
                                    </dt>
                                    <dd className="text-3xl font-bold text-gray-900">
                                        {stats?.total_users || 0}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-body">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Activity className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Active Users
                                    </dt>
                                    <dd className="text-3xl font-bold text-gray-900">
                                        {stats?.active_users || 0}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-body">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <FileText className="h-8 w-8 text-purple-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Posts
                                    </dt>
                                    <dd className="text-3xl font-bold text-gray-900">
                                        {stats?.total_posts || 0}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Recent Users */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-lg font-medium text-gray-900">Recent Users</h2>
                    </div>
                    <div className="card-body">
                        {recentUsers && recentUsers.length > 0 ? (
                            <div className="space-y-4">
                                {recentUsers.map((user) => (
                                    <div key={user.id} className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                <Users className="h-5 w-5 text-gray-500" />
                                            </div>
                                        </div>
                                        <div className="ml-4 flex-1">
                                            <p className="text-sm font-medium text-gray-900">
                                                {user.name}
                                            </p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${user.is_active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-4">No users found</p>
                        )}
                    </div>
                </div>

                {/* Recent Posts */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="text-lg font-medium text-gray-900">Recent Posts</h2>
                    </div>
                    <div className="card-body">
                        {recentPosts && recentPosts.length > 0 ? (
                            <div className="space-y-4">
                                {recentPosts.map((post) => (
                                    <div key={post.id} className="border-l-4 border-blue-400 pl-4">
                                        <h3 className="text-sm font-medium text-gray-900">
                                            {post.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                            {post.content.substring(0, 100)}
                                            {post.content.length > 100 ? '...' : ''}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            Author ID: {post.author_id} • {new Date(post.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-4">No posts found</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}