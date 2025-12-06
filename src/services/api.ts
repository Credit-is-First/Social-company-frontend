import axios, { AxiosResponse } from 'axios';
import { Book, User, Loan, CreateBookDto, UpdateBookDto, CreateUserDto, UpdateUserDto, CreateLoanDto, UpdateLoanDto } from '../types';

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
  create: (data: CreateBookDto): Promise<AxiosResponse<Book>> => 
    api.post('/books', data),
  update: (id: number, data: UpdateBookDto): Promise<AxiosResponse<Book>> => 
    api.patch(`/books/${id}`, data),
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

export default api;

