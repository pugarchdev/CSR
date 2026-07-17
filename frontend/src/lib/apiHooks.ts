import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";

export const useApiQuery = <T>(
  key: string[],
  path: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  }
) => {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => apiFetch<T>(path),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 60 * 1000,
    gcTime: options?.gcTime ?? 5 * 60 * 1000,
  });
};

export const useApiMutation = <TData, TVariables>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    invalidateKeys?: string[][];
  }
) => {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const response = await apiFetch<TData>(path, {
        method,
        body: JSON.stringify(variables),
      });
      return response;
    },
    onSuccess: (data) => {
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((keys) => {
          queryClient.invalidateQueries({ queryKey: keys });
        });
      }
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};

export const usePrefetchRoutes = (routes: string[]) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    routes.forEach((route) => {
      queryClient.prefetchQuery({
        queryKey: [route],
        queryFn: () => apiFetch(route),
        staleTime: 5 * 60 * 1000,
      });
    });
  }, [queryClient, routes]);
};
