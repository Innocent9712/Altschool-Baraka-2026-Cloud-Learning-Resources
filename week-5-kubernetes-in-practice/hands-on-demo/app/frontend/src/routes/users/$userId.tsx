import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { userApi, postApi, type UpdateUserData } from '../../lib/api'
import { ArrowLeft, Edit, Save, X, FileText } from 'lucide-react'
import { useForm } from 'react-hook-form'

export const Route = createFileRoute('/users/$userId')({
  component: UserDetail,
})

function UserDetail() {
  const { userId } = Route.useParams()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => userApi.getUser(parseInt(userId)).then(res => res.data),
  })

  const { data: userPosts } = useQuery({
    queryKey: ['posts', 'by-author', userId],
    queryFn: () => postApi.getPosts({ author_id: parseInt(userId) }).then(res => res.data),
    enabled: !!user,
  })

  const updateUserMutation = useMutation({
    mutationFn: (data: UpdateUserData) => userApi.updateUser(parseInt(userId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', userId] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsEditing(false)
    },
  })

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="card">
            <div className="card-body">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <p className="text-gray-500">User not found</p>
          <Link to="/users" className="btn btn-primary mt-4">
            Back to Users
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate({ to: '/users' })}
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>
          <div className="flex space-x-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-secondary flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary flex items-center"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Details */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">User Information</h2>
            </div>
            <div className="card-body">
              {isEditing ? (
                <EditUserForm
                  user={user}
                  onSubmit={(data) => updateUserMutation.mutate(data)}
                  isLoading={updateUserMutation.isPending}
                />
              ) : (
                <UserInfo user={user} />
              )}
            </div>
          </div>
        </div>

        {/* User Stats */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Statistics</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${user.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Posts</span>
                  <span className="text-sm font-medium text-gray-900">
                    {userPosts?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Joined</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Last Login</span>
                  <span className="text-sm font-medium text-gray-900">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Posts */}
      {userPosts && userPosts.length > 0 && (
        <div className="mt-8">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Posts ({userPosts.length})
              </h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {userPosts.map((post) => (
                  <div key={post.id} className="border-l-4 border-blue-400 pl-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                          {post.title}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">
                          {post.content.substring(0, 200)}
                          {post.content.length > 200 ? '...' : ''}
                        </p>
                        <p className="text-xs text-gray-400">
                          Created: {new Date(post.created_at).toLocaleDateString()} •
                          Updated: {new Date(post.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Link
                        to="/posts/$postId"
                        params={{ postId: post.id.toString() }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-4"
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UserInfo({ user }: { user: any }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div>
        <label className="form-label">Name</label>
        <p className="text-sm text-gray-900">{user.name}</p>
      </div>
      <div>
        <label className="form-label">Email</label>
        <p className="text-sm text-gray-900">{user.email}</p>
      </div>
      <div>
        <label className="form-label">Status</label>
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${user.is_active
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'
          }`}>
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div>
        <label className="form-label">User ID</label>
        <p className="text-sm text-gray-900">{user.id}</p>
      </div>
    </div>
  )
}

function EditUserForm({
  user,
  onSubmit,
  isLoading
}: {
  user: any
  onSubmit: (data: UpdateUserData) => void
  isLoading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<UpdateUserData>({
    defaultValues: {
      name: user.name,
      email: user.email,
      is_active: user.is_active,
    }
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label">Name</label>
          <input
            type="text"
            {...register('name', { required: 'Name is required' })}
            className="form-input"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="form-label">Email</label>
          <input
            type="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^\S+@\S+$/i,
                message: 'Invalid email address'
              }
            })}
            className="form-input"
            disabled={isLoading}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
      </div>
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            {...register('is_active')}
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            disabled={isLoading}
          />
          <span className="ml-2 text-sm text-gray-700">Active User</span>
        </label>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="btn btn-primary flex items-center"
          disabled={isLoading}
        >
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}