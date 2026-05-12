import { objectToFormData } from '@/common/utils/object-to-form-data';
import { toQueryString } from '@/common/utils/query-string';
import { httpClient } from '@/shared/api/http-client';
import type {
    FollowersResponse,
    ForgotPasswordRequest,
    ResetForgotPasswordRequest,
    UpdateUserRequest,
    UserProfileResponse,
} from './contracts';
import { ApiResponse } from '@/common/types/api';

export const usersApi = {
    getProfile(publicId?: string) {
        return httpClient.post<UserProfileResponse>(`/api/User/profile/${publicId}`, undefined, {
            auth: true,
        });
    },
    updateProfile(payload: UpdateUserRequest) {
        return httpClient.post('/api/User/profile/update', objectToFormData(payload), {
            auth: true,
        });
    },
    forgotPassword(payload: ForgotPasswordRequest) {
        return httpClient.post<ApiResponse<boolean>>('/api/User/request-forget_password', payload);
    },
    resetForgotPassword(payload: ResetForgotPasswordRequest) {
        return httpClient.post<ApiResponse<boolean>>('/api/User/reset_password', payload);
    },
    follow(userIdTarget: number) {
        return httpClient.post('/api/User/follow', userIdTarget, {
            auth: true,
        });
    },
    unfollow(userIdTarget: number) {
        return httpClient.post('/api/User/unfollow', userIdTarget, {
            auth: true,
        });
    },
    getFollowers(userTargetId?: number, page = 1, limit = 10) {
        const query = toQueryString({
            userTargetId,
            'paganation.page': page,
            'paganation.limit': limit,
        });

        return httpClient.get<FollowersResponse>(`/api/User/followers${query}`, {
            auth: true,
        });
    },
};
