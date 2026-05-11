import { objectToFormData } from '@/common/utils/object-to-form-data';
import { toQueryString } from '@/common/utils/query-string';
import { httpClient } from '@/shared/api/http-client';
import type { FollowersResponse, UpdateUserRequest, UserProfileResponse } from './contracts';

export const usersApi = {
    getProfile(userId: number) {
        return httpClient.post<UserProfileResponse>(`/api/User/profile/${userId}`, undefined, {
            auth: true,
        });
    },
    updateProfile(payload: UpdateUserRequest) {
        return httpClient.post('/api/User/profile/update', objectToFormData(payload), {
            auth: true,
        });
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
