export type AuthenticationPolicy = {
    auth: boolean;
    guestOnly?: boolean;
    redirectTo?: string;
    roles?: readonly string[];
};

export type SecurityRule = {
    authentication: AuthenticationPolicy;
    endpoint: string;
};

export type AccessDecision =
    | { allowed: true }
    | {
          allowed: false;
          reason: 'guest-only' | 'missing-auth' | 'missing-role';
          redirectTo: string;
      };
