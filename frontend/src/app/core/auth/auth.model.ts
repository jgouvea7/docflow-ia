export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresAt: string;
  user: AuthUser;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}
