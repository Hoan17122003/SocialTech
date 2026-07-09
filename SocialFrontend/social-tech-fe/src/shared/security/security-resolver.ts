import { APP_ROUTES } from '@/common/constants/app-routes';
import { API_SECURITY_RULES, ROUTE_SECURITY_RULES } from '@/shared/security/security.config';
import type { AccessDecision, AuthenticationPolicy, SecurityRule } from '@/shared/security/security.types';

const defaultPublicPolicy: AuthenticationPolicy = { auth: false };

function normalizeEndpoint(endpoint: string) {
    const rawPath = endpoint.startsWith('http') ? new URL(endpoint).pathname : endpoint;
    const [pathWithoutQuery] = rawPath.split(/[?#]/);
    const withLeadingSlash = pathWithoutQuery.startsWith('/') ? pathWithoutQuery : `/${pathWithoutQuery}`;

    return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, '') : withLeadingSlash;
}

function isDynamicSegment(segment: string) {
    return segment.startsWith(':') || (segment.startsWith('[') && segment.endsWith(']'));
}

function endpointMatches(pattern: string, endpoint: string) {
    const patternParts = normalizeEndpoint(pattern).split('/').filter(Boolean);
    const endpointParts = normalizeEndpoint(endpoint).split('/').filter(Boolean);

    for (let index = 0; index < patternParts.length; index += 1) {
        const patternPart = patternParts[index];
        const endpointPart = endpointParts[index];

        if (patternPart === '**') {
            return true;
        }

        if (!endpointPart) {
            return false;
        }

        if (patternPart === '*' || isDynamicSegment(patternPart)) {
            continue;
        }

        if (patternPart.toLowerCase() !== endpointPart.toLowerCase()) {
            return false;
        }
    }

    return patternParts.length === endpointParts.length;
}

function resolveSecurityRule(endpoint: string, rules: readonly SecurityRule[]) {
    // First match wins so config order can express exceptions before wildcards.
    return rules.find((rule) => endpointMatches(rule.endpoint, endpoint));
}

export function resolveRouteAuthentication(pathname: string) {
    return resolveSecurityRule(pathname, ROUTE_SECURITY_RULES)?.authentication ?? defaultPublicPolicy;
}

export function resolveApiAuthentication(path: string) {
    return resolveSecurityRule(path, API_SECURITY_RULES)?.authentication ?? defaultPublicPolicy;
}

function normalizeRole(role: string) {
    return role.trim().toLowerCase();
}

function hasRequiredRole(userRoles: readonly string[], requiredRoles: readonly string[]) {
    const normalizedUserRoles = new Set(userRoles.map(normalizeRole));

    return requiredRoles.some((role) => normalizedUserRoles.has(normalizeRole(role)));
}

export function decideRouteAccess(
    policy: AuthenticationPolicy,
    isAuthenticated: boolean,
    roles: readonly string[],
): AccessDecision {
    if (policy.guestOnly && isAuthenticated) {
        return {
            allowed: false,
            reason: 'guest-only',
            redirectTo: policy.redirectTo ?? APP_ROUTES.dashboard,
        };
    }

    if (policy.auth && !isAuthenticated) {
        return {
            allowed: false,
            reason: 'missing-auth',
            redirectTo: policy.redirectTo ?? APP_ROUTES.login,
        };
    }

    if (policy.auth && policy.roles?.length && !hasRequiredRole(roles, policy.roles)) {
        return {
            allowed: false,
            reason: 'missing-role',
            redirectTo: APP_ROUTES.dashboard,
        };
    }

    return { allowed: true };
}
