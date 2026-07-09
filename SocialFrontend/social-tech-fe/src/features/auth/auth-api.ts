import type { ApiResponse } from '@/common/types/api';
import { httpClient } from '@/shared/api/http-client';
import type { LoginRequest, LoginResponse, RegisterRequest } from './contracts';

export const authApi = {
    login(payload: LoginRequest) {
        return httpClient.post<LoginResponse>('/api/Auth/login', payload);
    },
    logout() {
        return httpClient.post<{ message: string }>('/api/Auth/logout');
    },
    register(payload: RegisterRequest) {
        return httpClient.post<ApiResponse<boolean>>('/api/User/create', payload);
    },
};
