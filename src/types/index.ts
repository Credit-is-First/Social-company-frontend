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

export type NotificationType =
  | 'loan_requested'
  | 'loan_approved'
  | 'loan_declined'
  | 'book_review_requested'
  | 'book_approved'
  | 'book_declined'
  | 'loan_due_soon'
  | 'loan_overdue'
  | 'loans_overdue_summary';

/** Named AppNotification so it does not shadow the browser's Notification. */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Route to open when the notification is clicked. */
  link: string | null;
  readAt: string | null;
  createdAt: string;
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

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  dateOfBirth?: string;
  gender?: Gender;
  occupation?: string;
  photoPath?: string;
  roles?: Role[];
  groups?: Group[];
  blocked?: boolean;
  /** Computed server-side: every required profile field is filled in. */
  profileComplete?: boolean;
  /** Human-readable labels of the fields still outstanding. */
  missingProfileFields?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileDto {
  name?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: Gender;
  occupation?: string;
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

