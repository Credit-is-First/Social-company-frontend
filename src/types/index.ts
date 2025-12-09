export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  description?: string;
  publishedDate?: string;
  isEbook?: boolean;
  filePath?: string;
  isApproved?: boolean;
  approvedBy?: number;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  ADMIN = 'admin',
  LIBRARIAN = 'librarian',
  USER = 'user',
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  address?: string;
  roles?: Role[];
  createdAt: string;
  updatedAt: string;
}

export type LoanStatus = 'active' | 'returned' | 'overdue';

export interface Loan {
  id: number;
  bookId: number;
  userId: number;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: LoanStatus;
  book?: Book;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookDto {
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
  description?: string;
  publishedDate?: string;
  isEbook?: boolean;
}

export interface UpdateBookDto extends Partial<CreateBookDto> {}

export interface CreateUserDto {
  name: string;
  email: string;
  phone: string;
  address?: string;
}

export interface UpdateUserDto extends Partial<CreateUserDto> {
  roleIds?: number[];
}

export interface CreateLoanDto {
  bookId: number;
  userId: number;
  borrowDate: string;
  dueDate: string;
}

export interface UpdateLoanDto {
  returnDate?: string;
  status?: LoanStatus;
}

export interface RegisterDto {
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  role?: UserRole;
  securityQuestion: string;
  securityAnswer: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ResetPasswordDto {
  email: string;
  securityAnswer: string;
  newPassword: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
}

