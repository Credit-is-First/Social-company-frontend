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
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  address?: string;
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
}

export interface UpdateBookDto extends Partial<CreateBookDto> {}

export interface CreateUserDto {
  name: string;
  email: string;
  phone: string;
  address?: string;
}

export interface UpdateUserDto extends Partial<CreateUserDto> {}

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

