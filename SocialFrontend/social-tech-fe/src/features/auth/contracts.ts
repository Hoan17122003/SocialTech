export type LoginRequest = {
    email: string;
    password: string;
};

export type LoginResponse = {
    accessToken: string;
    tokenType: string;
};

export type RegisterRequest = {
    username: string;
    displayName: string;
    email: string;
    password: string;
};
