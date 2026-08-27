import axios, { AxiosResponse } from 'axios';
import { Book, User, Loan, LoanStatus, Role, Group, CreateBookDto, UpdateBookDto, CreateUserDto, UpdateUserDto, CreateLoanDto, UpdateLoanDto, RegisterDto, LoginDto, ResetPasswordDto, ChangePasswordDto, AuthResponse, CreateGroupDto, UpdateGroupDto } from '../types';

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
  // Required for the httpOnly refresh cookie to travel on cross-origin
  // deployments. Same-origin (the CRA proxy) would send it anyway.
  withCredentials: true,
});

/**
 * The access token lives in a module variable and nowhere else.
 *
 * Nothing is written to localStorage or sessionStorage: the refresh token is in
 * an httpOnly cookie the page cannot read, and the access token dies with the
 * tab. Injected script can still act as the user while the page is open, but it
 * cannot exfiltrate a credential that outlives the page.
 */
let accessToken: string | null = null;

/*
 * Earlier builds kept the tokens and the user record in localStorage. Those
 * entries survive the upgrade in every browser that has already used the app,
 * so purge them on load — otherwise the exposure this change exists to remove
 * would simply persist.
 */
(function purgeLegacyStorage() {
  try {
    ['token', 'refresh_token', 'user'].forEach(key => localStorage.removeItem(key));
  } catch (error) {
    // Storage can be unavailable (private mode, blocked cookies); ignore.
  }
})();

type SessionListener = (session: AuthResponse | null) => void;
let sessionListener: SessionListener | null = null;

/** Lets AuthContext stay in step with refreshes driven by the interceptor. */
export const onSessionChange = (listener: SessionListener | null): void => {
  sessionListener = listener;
};

export const getAccessToken = (): string | null => accessToken;

export const setSession = (session: AuthResponse): void => {
  accessToken = session.access_token;
  if (sessionListener) sessionListener(session);
};

export const clearSession = (): void => {
  accessToken = null;
  if (sessionListener) sessionListener(null);
};

/**
 * One shared refresh for the whole tab.
 *
 * Startup and the 401 interceptor both go through this. Refresh tokens rotate,
 * so two overlapping calls would send the same cookie and the second would look
 * like a replay to the server — collapsing them into a single request is what
 * keeps an ordinary double-mount from ending the session.
 */
let refreshInFlight: Promise<AuthResponse> | null = null;

export const refreshSession = (): Promise<AuthResponse> => {
  if (!refreshInFlight) {
    const settle = () => {
      refreshInFlight = null;
    };

    refreshInFlight = authAPI
      .refresh()
      .then(response => {
        settle();
        setSession(response.data);
        return response.data;
      })
      .catch(error => {
        settle();
        throw error;
      });
  }

  return refreshInFlight;
};

/** Hands a downloaded blob to the browser as a file save. */
const triggerBlobDownload = (data: BlobPart, filename: string, type: string): void => {
  const url = window.URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const filenameFromResponse = (response: AxiosResponse, fallback: string): string => {
  const disposition: string = response.headers['content-disposition'] || '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  if (!match) {
    return fallback;
  }
  try {
    return decodeURIComponent(match[1].trim());
  } catch (e) {
    return match[1].trim();
  }
};

export const booksAPI = {
  // Note: GET /books always returns a paginated envelope. Use getPaginated.
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
  exportToCSV: async (filters?: {
    search?: string;
    status?: string;
    title?: string;
    author?: string;
    isbn?: string;
    category?: string;
  }): Promise<void> => {
    const response = await api.get('/books/export/csv', {
      params: filters,
      responseType: 'blob', // Important for file download
    });

    const timestamp = new Date().toISOString().split('T')[0];
    triggerBlobDownload(response.data, `books-export-${timestamp}.csv`, 'text/csv');
  },
  // Ebook files are behind auth now, so they have to be fetched with the token
  // rather than linked to directly.
  downloadEbook: async (id: string, fallbackName: string = 'ebook'): Promise<void> => {
    const response = await api.get(`/books/${id}/file`, { responseType: 'blob' });
    const filename = filenameFromResponse(response, fallbackName);
    triggerBlobDownload(response.data, filename, response.headers['content-type'] || 'application/octet-stream');
  },
  importFromCSV: async (file: File): Promise<{
    success: number;
    errors: number;
    results: Array<{ row: number; book: string; status: 'success' | 'error'; message?: string }>;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/books/import/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
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
  getPending: (): Promise<AxiosResponse<Loan[]>> =>
    api.get('/loans/pending'),
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
  approve: (id: string): Promise<AxiosResponse<Loan>> =>
    api.patch(`/loans/${id}/approve`),
  decline: (id: string): Promise<AxiosResponse<Loan>> =>
    api.patch(`/loans/${id}/decline`),
  returnLoan: (id: string): Promise<AxiosResponse<Loan>> =>
    api.patch(`/loans/${id}/return`),
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
  getSecurityQuestion: (email: string): Promise<AxiosResponse<{ securityQuestion: string }>> =>
    api.get('/auth/security-question', { params: { email } }),
  // Bare axios on purpose: going through `api` would re-enter the 401
  // interceptor, and a failed bootstrap on an anonymous page load would bounce
  // the visitor to /login before the router had a chance to decide.
  refresh: (): Promise<AxiosResponse<AuthResponse>> =>
    axios.post('/auth/refresh', {}, { withCredentials: true }),
  logout: (): Promise<AxiosResponse<{ message: string }>> =>
    axios.post('/auth/logout', {}, { withCredentials: true }),
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

export interface DashboardRecentLoan {
  id: string;
  bookTitle: string;
  userName: string;
  status: LoanStatus;
  createdAt: string;
}

export interface DashboardLoansPerDay {
  date: string;
  loans: number;
}

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
  loansOverTime: DashboardLoansPerDay[];
  recentLoans: DashboardRecentLoan[];
}

export const dashboardAPI = {
  getStats: (): Promise<AxiosResponse<DashboardStats>> => 
    api.get('/dashboard/stats'),
};

// Attach the in-memory access token. Because it is an explicit header rather
// than a cookie, the browser never sends it automatically — which is what keeps
// the whole API immune to CSRF.
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

const AUTH_PATHS = ['/login', '/setup', '/register', '/reset-password'];

const redirectToLogin = (): void => {
  const currentPath = window.location.pathname;
  if (AUTH_PATHS.indexOf(currentPath) === -1) {
    // Hard redirect so no stale React state survives.
    window.location.href = '/login';
  }
};

// The browser supplies the refresh token from the httpOnly cookie; this code
// has no way to read or forge it. Shared with startup via refreshSession().
const runRefresh = (): Promise<string> =>
  refreshSession().then(session => session.access_token);

// Handle 401 responses: try to refresh once, then give up and sign out.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const original = error.config;

    if (status !== 401 || !original) {
      return Promise.reject(error);
    }

    const url: string = original.url || '';
    const isAuthCall = url.indexOf('/auth/refresh') !== -1 || url.indexOf('/auth/login') !== -1;

    if (original._retried || isAuthCall) {
      clearSession();
      redirectToLogin();
      return Promise.reject(error);
    }

    original._retried = true;

    // runRefresh() is already collapsed to one shared request per tab, so a
    // burst of parallel 401s rotates the cookie exactly once.
    return runRefresh().then(
      (token) => {
        original.headers = { ...(original.headers || {}), Authorization: `Bearer ${token}` };
        return api(original);
      },
      () => {
        clearSession();
        redirectToLogin();
        return Promise.reject(error);
      },
    );
  }
);

export default api;

