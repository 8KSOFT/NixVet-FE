export type ApiErrorMessage = string | string[];

export interface ApiErrorResponse {
  message?: ApiErrorMessage;
}

export interface ApiRequestError {
  response?: {
    status?: number;
    data?: ApiErrorResponse;
  };
  message?: string;
}
