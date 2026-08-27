export interface Book {
  id: string;
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
  status?: 'working' | 'reviewing' | 'approved' | 'declined' | 'deprecated';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  deprecationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  resource?: string;
  action?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  roles?: Role[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  roles?: Role[];
  groups?: Group[];
  blocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LoanStatus = 'active' | 'returned' | 'overdue' | 'pending' | 'declined';

export interface Loan {
  id: string;
  bookId: string;
  userId: string;
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
  password: string;
  address?: string;
  roleIds?: string[];
  groupIds?: string[];
}

export interface UpdateUserDto extends Partial<CreateUserDto> {
  roleIds?: string[];
  groupIds?: string[];
  blocked?: boolean;
}

export interface CreateLoanDto {
  bookId: string;
  userId: string;
  borrowDate: string;
  dueDate: string;
}

export interface CreateGroupDto {
  name: string;
  description?: string;
  roleIds?: string[];
  isDefault?: boolean;
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
  roleIds?: string[];
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
  // No refresh token here by design — it is delivered as an httpOnly cookie
  // that page script cannot read.
}

