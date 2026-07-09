import { APP_ROUTES } from '@/common/constants/app-routes';
import type { SecurityRule } from '@/shared/security/security.types';

export const APP_ROLES = {
    admin: 'Role_Admin',
    lover: 'Role_Lover',
    member: 'Role_Member',
} as const;

const publicAccess = { auth: false } as const;
const authenticatedAccess = { auth: true, redirectTo: APP_ROUTES.login } as const;

// Route policies protect Next.js pages on the client.
// Put exact/specific routes before broader dynamic patterns when adding new entries.
export const ROUTE_SECURITY_RULES: SecurityRule[] = [
    { endpoint: APP_ROUTES.home, authentication: publicAccess },
    { endpoint: APP_ROUTES.login, authentication: { auth: false, guestOnly: true, redirectTo: APP_ROUTES.dashboard } },
    {
        endpoint: APP_ROUTES.register,
        authentication: { auth: false, guestOnly: true, redirectTo: APP_ROUTES.dashboard },
    },
    { endpoint: '/forgetpassword-validate/:token', authentication: publicAccess },
    { endpoint: APP_ROUTES.dashboard, authentication: authenticatedAccess },
    { endpoint: APP_ROUTES.createArticle, authentication: authenticatedAccess },
    { endpoint: '/articles/:id', authentication: authenticatedAccess },
    { endpoint: '/article/:id/update', authentication: authenticatedAccess },
    { endpoint: APP_ROUTES.news, authentication: authenticatedAccess },
    { endpoint: APP_ROUTES.profile, authentication: authenticatedAccess },
    { endpoint: '/profile/:id', authentication: authenticatedAccess },
    { endpoint: '/user/:id/updateprofile', authentication: authenticatedAccess },
    { endpoint: '/user/profile/:id', authentication: authenticatedAccess },

    // tạm thời tắt bảo mật cho api này
    { endpoint: APP_ROUTES.featureHand, authentication: publicAccess },
];

// API policies tell httpClient when it should attach the bearer token.
// Backend still owns final authorization; FE roles here are for route/UI decisions and documentation.
export const API_SECURITY_RULES: SecurityRule[] = [
    { endpoint: '/api/Auth/login', authentication: publicAccess },
    { endpoint: '/api/User/create', authentication: publicAccess },
    { endpoint: '/api/User/request-forget_password', authentication: publicAccess },
    { endpoint: '/api/User/reset_password', authentication: publicAccess },
    { endpoint: '/api/Auth/logout', authentication: authenticatedAccess },
    { endpoint: '/api/User/**', authentication: authenticatedAccess },
    { endpoint: '/api/Article/**', authentication: authenticatedAccess },
    { endpoint: '/api/Chat/**', authentication: authenticatedAccess },

    // tạm thời tắt bảo mật cho api này
    { endpoint: '/api/lover/features-hand', authentication: publicAccess },
];
