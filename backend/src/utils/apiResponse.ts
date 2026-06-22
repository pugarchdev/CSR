import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export const successResponse = <T>(res: Response, data: T, message?: string, statusCode = 200): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  } as ApiResponse<T>);
};

export const errorResponse = (res: Response, message: string, statusCode = 400): Response => {
  return res.status(statusCode).json({
    success: false,
    error: message
  } as ApiResponse);
};

export const createdResponse = <T>(res: Response, data: T, message = "Created successfully"): Response => {
  return res.status(201).json({
    success: true,
    data,
    message
  } as ApiResponse<T>);
};

export const notFoundResponse = (res: Response, message = "Resource not found"): Response => {
  return res.status(404).json({
    success: false,
    error: message
  } as ApiResponse);
};

export const unauthorizedResponse = (res: Response, message = "Unauthorized"): Response => {
  return res.status(401).json({
    success: false,
    error: message
  } as ApiResponse);
};

export const forbiddenResponse = (res: Response, message = "Forbidden"): Response => {
  return res.status(403).json({
    success: false,
    error: message
  } as ApiResponse);
};

export const validationErrorResponse = (res: Response, message: string): Response => {
  return res.status(422).json({
    success: false,
    error: message
  } as ApiResponse);
};

export const serverErrorResponse = (res: Response, message = "Internal server error"): Response => {
  return res.status(500).json({
    success: false,
    error: message
  } as ApiResponse);
};