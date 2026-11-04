import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Users, FileText, BarChart3, Activity } from 'lucide-react'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Demo App</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                  activeProps={{
                    className: "border-blue-500 text-gray-900 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                  }}
                >
                  <BarChart3 className="w-4 h-4 inline-block mr-1" />
                  Dashboard
                </Link>
                <Link
                  to="/users"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                  activeProps={{
                    className: "border-blue-500 text-gray-900 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                  }}
                >
                  <Users className="w-4 h-4 inline-block mr-1" />
                  Users
                </Link>
                <Link
                  to="/posts"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                  activeProps={{
                    className: "border-blue-500 text-gray-900 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                  }}
                >
                  <FileText className="w-4 h-4 inline-block mr-1" />
                  Posts
                </Link>
                <Link
                  to="/health"
                  className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors"
                  activeProps={{
                    className: "border-blue-500 text-gray-900 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                  }}
                >
                  <Activity className="w-4 h-4 inline-block mr-1" />
                  Health
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

    </div>
  ),
})