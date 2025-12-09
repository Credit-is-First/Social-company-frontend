import axios, { AxiosResponse } from 'axios';
import { Book, User, Loan, CreateBookDto, UpdateBookDto, CreateUserDto, UpdateUserDto, CreateLoanDto, UpdateLoanDto, RegisterDto, LoginDto, ResetPasswordDto, ChangePasswordDto, AuthResponse } from '../types';

const API_BASE_URL = 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const booksAPI = {
  getAll: (search?: string): Promise<AxiosResponse<Book[]>> => 
    api.get('/books', { params: { search } }),
  getById: (id: number): Promise<AxiosResponse<Book>> => 
    api.get(`/books/${id}`),
  create: (data: CreateBookDto, file?: File): Promise<AxiosResponse<Book>> => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      const value = data[key as keyof CreateBookDto];
      if (value !== undefined && value !== null) {
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
  update: (id: number, data: UpdateBookDto, file?: File): Promise<AxiosResponse<Book>> => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      const value = data[key as keyof UpdateBookDto];
      if (value !== undefined && value !== null) {
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
  delete: (id: number): Promise<AxiosResponse<void>> => 
    api.delete(`/books/${id}`),
};

export const usersAPI = {
  getAll: (search?: string): Promise<AxiosResponse<User[]>> => 
    api.get('/users', { params: { search } }),
  getById: (id: number): Promise<AxiosResponse<User>> => 
    api.get(`/users/${id}`),
  create: (data: CreateUserDto): Promise<AxiosResponse<User>> => 
    api.post('/users', data),
  update: (id: number, data: UpdateUserDto): Promise<AxiosResponse<User>> => 
    api.patch(`/users/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<void>> => 
    api.delete(`/users/${id}`),
};

export const loansAPI = {
  getAll: (userId?: number, bookId?: number): Promise<AxiosResponse<Loan[]>> => 
    api.get('/loans', { params: { userId, bookId } }),
  getActive: (): Promise<AxiosResponse<Loan[]>> => 
    api.get('/loans/active'),
  getById: (id: number): Promise<AxiosResponse<Loan>> => 
    api.get(`/loans/${id}`),
  create: (data: CreateLoanDto): Promise<AxiosResponse<Loan>> => 
    api.post('/loans', data),
  update: (id: number, data: UpdateLoanDto): Promise<AxiosResponse<Loan>> => 
    api.patch(`/loans/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<void>> => 
    api.delete(`/loans/${id}`),
};

export const authAPI = {
  register: (data: RegisterDto): Promise<AxiosResponse<AuthResponse>> => 
    api.post('/auth/register', data),
  login: (data: LoginDto): Promise<AxiosResponse<AuthResponse>> => 
    api.post('/auth/login', data),
  resetPassword: (data: ResetPasswordDto): Promise<AxiosResponse<{ message: string }>> => 
    api.post('/auth/reset-password', data),
  changePassword: (data: ChangePasswordDto): Promise<AxiosResponse<{ message: string }>> => 
    api.patch('/auth/change-password', data),
  getProfile: (): Promise<AxiosResponse<User>> => 
    api.get('/auth/profile'),
};

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

