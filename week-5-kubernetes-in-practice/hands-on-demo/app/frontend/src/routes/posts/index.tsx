import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { postApi, userApi, type CreatePostData } from '../../lib/api'
import { Plus, Eye, Trash2, User, Calendar } from 'lucide-react'
import { useForm } from 'react-hook-form'

export const Route = createFileRoute('/posts/')({
    component: Posts,
})

function Posts() {
    const [showCreateForm, setShowCreateForm] = useState(false)
    const queryClient = useQueryClient()

    const { data: posts, isLoading } = useQuery({
        queryKey: ['posts'],
        queryFn: () => postApi.getPosts().then(res => res.data),
    })

    const { data: users } = useQuery({
        queryKey: ['users', 'for-posts'],
        queryFn: () => userApi.getUsers().then(res => res.data),
    })

    const createPostMutation = useMutation({
        mutationFn: postApi.createPost,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts'] })
            queryClient.invalidateQueries({ queryKey: ['analytics'] })
            setShowCreateForm(false)
        },
    })

    const deletePostMutation = useMutation({
        mutationFn: postApi.deletePost,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts'] })
            queryClient.invalidateQueries({ queryKey: ['analytics'] })
        },
    })

    const getUserName = (authorId: number) => {
        const user = users?.find(u => u.id === authorId)
        return user?.name || `User ${authorId}`
    }

    return (
        <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
                        <p className="mt-2 text-gray-600">Manage application posts</p>
                    </div>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="btn btn-primary flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Post
                    </button>
                </div>
            </div>
            {/* Create Post Form */}
            {showCreateForm && (
                <CreatePostForm
                    users={users || []}
                    onSubmit={(data) => createPostMutation.mutate(data)}
                    onCancel={() => setShowCreateForm(false)}
                    isLoading={createPostMutation.isPending}
                />
            )}
            {/* Posts Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {isLoading ? (
                    // Loading skeleton
                    (Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="card">
                            <div className="card-body animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                                <div className="space-y-2 mb-4">
                                    <div className="h-3 bg-gray-200 rounded"></div>
                                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                                    <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/6"></div>
                                </div>
                            </div>
                        </div>
                    )))
                ) : posts && posts.length > 0 ? (
                    posts.map((post) => (
                        <div key={post.id} className="card hover:shadow-md transition-shadow">
                            <div className="card-body">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                                        {post.title}
                                    </h3>
                                    <div className="flex space-x-2 ml-2">
                                        <Link
                                            to="/posts/$postId"
                                            params={{ postId: post.id.toString() }}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                        <button
                                            onClick={() => deletePostMutation.mutate(post.id)}
                                            disabled={deletePostMutation.isPending}
                                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                    {post.content}
                                </p>

                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <div className="flex items-center">
                                        <User className="w-3 h-3 mr-1" />
                                        <Link
                                            to="/users/$userId"
                                            params={{ userId: post.author_id.toString() }}
                                            className="hover:text-blue-600"
                                        >
                                            {getUserName(post.author_id)}
                                        </Link>
                                    </div>
                                    <div className="flex items-center">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {new Date(post.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                {post.updated_at !== post.created_at && (
                                    <div className="mt-2 text-xs text-gray-400">
                                        Updated: {new Date(post.updated_at).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12">
                        <div className="max-w-md mx-auto">
                            <div className="mx-auto h-12 w-12 text-gray-400">
                                <Plus className="w-full h-full" />
                            </div>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No posts</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Get started by creating a new post.
                            </p>
                            <div className="mt-6">
                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className="btn btn-primary"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Post
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function CreatePostForm({
    users,
    onSubmit,
    onCancel,
    isLoading
}: {
    users: any[]
    onSubmit: (data: CreatePostData) => void
    onCancel: () => void
    isLoading: boolean
}) {
    const { register, handleSubmit, formState: { errors }, reset } = useForm<CreatePostData>()

    const handleFormSubmit = (data: CreatePostData) => {
        onSubmit({
            ...data,
            author_id: parseInt(data.author_id.toString())
        })
        reset()
    }

    return (
        <div className="mb-6">
            <div className="card">
                <div className="card-header">
                    <h2 className="text-lg font-medium text-gray-900">Create New Post</h2>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                        <div>
                            <label className="form-label">Title</label>
                            <input
                                type="text"
                                {...register('title', { required: 'Title is required' })}
                                className="form-input"
                                disabled={isLoading}
                            />
                            {errors.title && (
                                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="form-label">Author</label>
                            <select
                                {...register('author_id', { required: 'Author is required' })}
                                className="form-input"
                                disabled={isLoading}
                            >
                                <option value="">Select an author</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                            </select>
                            {errors.author_id && (
                                <p className="mt-1 text-sm text-red-600">{errors.author_id.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="form-label">Content</label>
                            <textarea
                                rows={6}
                                {...register('content', { required: 'Content is required' })}
                                className="form-input"
                                disabled={isLoading}
                            />
                            {errors.content && (
                                <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="btn btn-secondary"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Creating...' : 'Create Post'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}