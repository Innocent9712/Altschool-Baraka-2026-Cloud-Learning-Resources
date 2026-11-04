import axios from 'axios'

// The API is called on the SAME address the page was loaded from, under /api.
// In Kubernetes the Ingress sends /api to the backend and everything else to this frontend,
// so the same image works in any environment without rebuilding it.
export const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
})

// Types
export interface User {
    id: number
    name: string
    email: string
    is_active: boolean
    created_at: string
    last_login?: string
}

export interface Post {
    id: number
    title: string
    content: string
    author_id: number
    created_at: string
    updated_at: string
}

export interface CreateUserData {
    name: string
    email: string
    password: string
}

export interface UpdateUserData {
    name?: string
    email?: string
    is_active?: boolean
}

export interface CreatePostData {
    title: string
    content: string
    author_id: number
}

export interface UpdatePostData {
    title?: string
    content?: string
}

export interface LoginData {
    email: string
    password: string
}

export interface AnalyticsStats {
    total_users: number
    active_users: number
    total_posts: number
    generated_at: string
}

// API functions
export const userApi = {
    getUsers: (params?: { skip?: number; limit?: number; search?: string }) =>
        api.get<User[]>('/users', { params }),

    getUser: (id: number) =>
        api.get<User>(`/users/${id}`),

    createUser: (data: CreateUserData) =>
        api.post<User>('/users', data),

    updateUser: (id: number, data: UpdateUserData) =>
        api.put<User>(`/users/${id}`, data),

    deleteUser: (id: number) =>
        api.delete(`/users/${id}`),

    login: (data: LoginData) =>
        api.post<{ message: string; user_id: number }>('/auth/login', data),
}

export const postApi = {
    getPosts: (params?: { skip?: number; limit?: number; author_id?: number }) =>
        api.get<Post[]>('/posts', { params }),

    getPost: (id: number) =>
        api.get<Post>(`/posts/${id}`),

    createPost: (data: CreatePostData) =>
        api.post<Post>('/posts', data),

    updatePost: (id: number, data: UpdatePostData) =>
        api.put<Post>(`/posts/${id}`, data),

    deletePost: (id: number) =>
        api.delete(`/posts/${id}`),
}

export const analyticsApi = {
    getStats: () =>
        api.get<AnalyticsStats>('/analytics/stats'),
}

export const healthApi = {
    check: () =>
        api.get<{ status: string; timestamp: string; redis: string; pod: string }>('/health'),
}