export interface LoginCredentials {
  userServer: string;
  userId: string;
  userPassword: string;
}

export interface LoginRequest {
  from_origin: string;
  userServer: string;
  userId: string;
  userPassword: string;
  envServer: string;
  referrer: string;
}

export interface LoginApiUser {
  id: string;
  name: string;
  email: string;
  group_id: string;
  jabatan_name: string;
  branch_id: string;
  branch_name: string;
}

export interface LoginApiResponse {
  status: 'OK' | 'NOT OK' | string;
  message?: string;
  token?: string;
  data?: LoginApiUser[];
}

export interface AuthUser {
  id: string;
  name: string;
  jabatanName: string;
  branchName: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}
