export type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T | null;
    responseTime: string;
    errors: string[];
};

export type ApiErrorPayload = {
    message?: string;
    errors?: string[];
    success?: boolean;
};

export class ApiError extends Error {
    status: number;
    errors: string[];

    constructor(status: number, message: string, errors: string[] = []) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }
}
