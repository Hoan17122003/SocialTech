import type { ApiResponse } from '@/common/types/api';

export type UserRecentPost = {
    postId: number;
    title: string;
    pathAttachment: string[];
    body: string;
    updatedAt: string;
};

export type UserProfile = {
    displayName: string;
    bio: string;
    profileImageUrl: string;
    isPrivateAccount: boolean;
    followersCount: number;
    followingsCount: number;
    recentPosts: UserRecentPost[];
    isPermissionEdit: boolean;
};

export type UpdateUserRequest = {
    displayName?: string;
    password?: string;
    bio?: string;
    profileImageUrl?: File;
};

export type FollowerUser = {
    userId: number;
    displayName: string;
    profileImageUrl: string;
};

export type UserProfileResponse = ApiResponse<UserProfile>;
export type FollowersResponse = ApiResponse<FollowerUser[]>;
