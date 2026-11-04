import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { postApi, userApi, type UpdatePostData } from '../../lib/api'
import { ArrowLeft, Edit, Save, X, User, Calendar, Clock } from 'lucide-react'
import { useForm } from 'react-hook-form'

export const Route = createFileRoute('/posts/$postId')({
    component: PostDetail,
})

function PostDetail() {
    const { postId } = Route.useParams()
    const navigate = useNavigate()
    const [isEditing, setIsEditing] = useState(false)
    const queryClient = useQueryClient()

    const { data: post, isLoading } = useQuery({
        queryKey: ['posts', postId],
        queryFn: () => postApi.getPost(parseInt(postId)).then(res => res.data),
    })

    const { data: author } = useQuery({
        queryKey: ['users', post?.author_id],
        queryFn: () => userApi.getUser(post!.author_id).then(res => res.data),
        enabled: !!post,
    })

    const updatePostMutation = useMutation({
        mutationFn: (data: UpdatePostData) => postApi.updatePost(parseInt(postId), data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts', postId] })
            queryClient.invalidateQueries({ queryKey: ['posts'] })
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
                                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-gray-200 rounded"></div>
                                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!post) {
        return (
            <div className="px-4 py-6 sm:px-0">
                <div className="text-center">
                    <p className="text-gray-500">Post not found</p>
                    <Link to="/posts" className="btn btn-primary mt-4">
                        Back to Posts
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
                            onClick={() => navigate({ to: '/posts' })}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{post.title}</h1>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                {author && (
                                    <div className="flex items-center">
                                        <User className="w-4 h-4 mr-1" />
                                        <Link
                                            to="/users/$userId"
                                            params={{ userId: author.id.toString() }}
                                            className="hover:text-blue-600"
                                        >
                                            {author.name}
                                        </Link>
                                    </div>
                                )}
                                <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-1" />
                                    {new Date(post.created_at).toLocaleDateString()}
                                </div>
                                {post.updated_at !== post.created_at && (
                                    <div className="flex items-center">
                                        <Clock className="w-4 h-4 mr-1" />
                                        Updated {new Date(post.updated_at).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
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

            {/* Post Content */}
            <div className="max-w-4xl">
                <div className="card">
                    <div className="card-body">
                        {isEditing ? (
                            <EditPostForm
                                post={post}
                                onSubmit={(data) => updatePostMutation.mutate(data)}
                                isLoading={updatePostMutation.isPending}
                            />
                        ) : (
                            <div className="prose max-w-none">
                                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                                    {post.content}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Author Information */}
                {author && !isEditing && (
                    <div className="mt-8">
                        <div className="card">
                            <div className="card-header">
                                <h2 className="text-lg font-medium text-gray-900">About the Author</h2>
                            </div>
                            <div className="card-body">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                                            <span className="text-lg font-medium text-gray-700">
                                                {author.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-medium text-gray-900">
                                            <Link
                                                to="/users/$userId"
                                                params={{ userId: author.id.toString() }}
                                                className="hover:text-blue-600"
                                            >
                                                {author.name}
                                            </Link>
                                        </h3>
                                        <p className="text-sm text-gray-500">{author.email}</p>
                                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                                            <span>Joined {new Date(author.created_at).toLocaleDateString()}</span>
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${author.is_active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {author.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function EditPostForm({
    post,
    onSubmit,
    isLoading
}: {
    post: any
    onSubmit: (data: UpdatePostData) => void
    isLoading: boolean
}) {
    const { register, handleSubmit, formState: { errors } } = useForm<UpdatePostData>({
        defaultValues: {
            title: post.title,
            content: post.content,
        }
    })

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <label className="form-label">Content</label>
                <textarea
                    rows={12}
                    {...register('content', { required: 'Content is required' })}
                    className="form-input"
                    disabled={isLoading}
                />
                {errors.content && (
                    <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                )}
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