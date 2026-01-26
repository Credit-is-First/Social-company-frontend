import axios, { AxiosResponse } from 'axios';
import { Book, User, Loan, Role, Group, CreateBookDto, UpdateBookDto, CreateUserDto, UpdateUserDto, CreateLoanDto, UpdateLoanDto, RegisterDto, LoginDto, ResetPasswordDto, ChangePasswordDto, AuthResponse, CreateGroupDto, UpdateGroupDto } from '../types';

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const booksAPI = {
  getAll: (search?: string): Promise<AxiosResponse<Book[]>> => 
    api.get('/books', { params: { search } }),
  getPaginated: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    status?: string;
    title?: string;
    author?: string;
    isbn?: string;
    category?: string;
  }): Promise<AxiosResponse<{ data: Book[]; total: number; page: number; limit: number; totalPages: number }>> =>
    api.get('/books', { params }),
  getById: (id: string): Promise<AxiosResponse<Book>> => 
    api.get(`/books/${id}`),
  create: (data: CreateBookDto, file?: File): Promise<AxiosResponse<Book>> => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      const value = data[key as keyof CreateBookDto];
      // Skip empty strings for optional fields
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value.toString());
      }
    });
    if (file) {
      formData.append('file', file);
    }
    return api.post('/books', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  update: (id: string, data: UpdateBookDto & { requestReview?: boolean }, file?: File): Promise<AxiosResponse<Book>> => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      const value = data[key as keyof (UpdateBookDto & { requestReview?: boolean })];
      // Skip empty strings for optional fields, but include boolean false
      if (value !== undefined && value !== null && (value !== '' || typeof value === 'boolean')) {
        formData.append(key, value.toString());
      }
    });
    if (file) {
      formData.append('file', file);
    }
    return api.patch(`/books/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/books/${id}`),
  approve: (id: string): Promise<AxiosResponse<Book>> => 
    api.patch(`/books/${id}/approve`),
  decline: (id: string, reason?: string): Promise<AxiosResponse<Book>> => 
    api.patch(`/books/${id}/decline`, { reason }),
  deprecate: (id: string, reason?: string): Promise<AxiosResponse<Book>> => 
    api.patch(`/books/${id}/deprecate`, { reason }),
};

export const usersAPI = {
  getAll: (search?: string): Promise<AxiosResponse<User[]>> => 
    api.get('/users', { params: { search } }),
  getById: (id: string): Promise<AxiosResponse<User>> => 
    api.get(`/users/${id}`),
  create: (data: CreateUserDto): Promise<AxiosResponse<User>> => 
    api.post('/users', data),
  update: (id: string, data: UpdateUserDto): Promise<AxiosResponse<User>> => 
    api.patch(`/users/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/users/${id}`),
  updateRoles: (id: string, roleIds: string[]): Promise<AxiosResponse<User>> => 
    api.patch(`/users/${id}/roles`, { roleIds }),
  updateGroups: (id: string, groupIds: string[]): Promise<AxiosResponse<User>> => 
    api.patch(`/users/${id}/groups`, { groupIds }),
  blockUser: (id: string, blocked: boolean): Promise<AxiosResponse<User>> => 
    api.patch(`/users/${id}/block`, { blocked }),
  resetPassword: (id: string, newPassword: string): Promise<AxiosResponse<User>> => 
    api.patch(`/users/${id}/reset-password`, { newPassword }),
};

export const rolesAPI = {
  getAll: (): Promise<AxiosResponse<Role[]>> => 
    api.get('/roles'),
  getById: (id: string): Promise<AxiosResponse<Role>> => 
    api.get(`/roles/${id}`),
};

export const loansAPI = {
  getAll: (userId?: string, bookId?: string): Promise<AxiosResponse<Loan[]>> => 
    api.get('/loans', { params: { userId, bookId } }),
  getActive: (): Promise<AxiosResponse<Loan[]>> => 
    api.get('/loans/active'),
  getMyLoans: (): Promise<AxiosResponse<Loan[]>> => 
    api.get('/loans/my'),
  getById: (id: string): Promise<AxiosResponse<Loan>> => 
    api.get(`/loans/${id}`),
  create: (data: CreateLoanDto): Promise<AxiosResponse<Loan>> => 
    api.post('/loans', data),
  borrow: (bookId: string): Promise<AxiosResponse<Loan>> => 
    api.post('/loans/borrow', { bookId }),
  update: (id: string, data: UpdateLoanDto): Promise<AxiosResponse<Loan>> => 
    api.patch(`/loans/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/loans/${id}`),
  cancelMyLoan: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/loans/my/${id}`),
};

export const authAPI = {
  checkSetup: (): Promise<AxiosResponse<{ needsSetup: boolean }>> => 
    api.get('/auth/check-setup'),
  setupSuperAdmin: (data: RegisterDto): Promise<AxiosResponse<User>> => 
    api.post('/auth/setup-super-admin', data),
  register: (data: RegisterDto): Promise<AxiosResponse<User>> => 
    api.post('/auth/register', data),
  login: (data: LoginDto): Promise<AxiosResponse<AuthResponse>> => 
    api.post('/auth/login', data),
  resetPassword: (data: ResetPasswordDto): Promise<AxiosResponse<{ message: string }>> => 
    api.post('/auth/reset-password', data),
  changePassword: (data: ChangePasswordDto): Promise<AxiosResponse<{ message: string }>> => 
    api.patch('/auth/change-password', data),
  getProfile: (): Promise<AxiosResponse<User>> => 
    api.get('/auth/profile'),
  updateProfile: (data: { name?: string; phone?: string; address?: string }): Promise<AxiosResponse<User>> => 
    api.patch('/auth/profile', data),
};

export const groupsAPI = {
  getAll: (): Promise<AxiosResponse<Group[]>> => 
    api.get('/groups'),
  getById: (id: string): Promise<AxiosResponse<Group>> => 
    api.get(`/groups/${id}`),
  create: (data: CreateGroupDto): Promise<AxiosResponse<Group>> => 
    api.post('/groups', data),
  update: (id: string, data: UpdateGroupDto): Promise<AxiosResponse<Group>> => 
    api.patch(`/groups/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<void>> => 
    api.delete(`/groups/${id}`),
};

export interface DashboardStats {
  totalBooks: number;
  totalUsers: number;
  activeLoans: number;
  overdueLoans: number;
  pendingLoans: number;
  totalLoans: number;
  returnedLoans: number;
  availableBooks: number;
  borrowedBooks: number;
  booksByCategory: { [key: string]: number };
  recentLoans: Loan[];
  allLoans: Loan[];
}

export const dashboardAPI = {
  getStats: (): Promise<AxiosResponse<DashboardStats>> => 
    api.get('/dashboard/stats'),
};

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on auth pages
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/setup' && currentPath !== '/register' && currentPath !== '/reset-password') {
        // Use window.location.href for hard redirect to ensure state is cleared
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

