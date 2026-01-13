import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { authFetch } from "@/lib/api";
import { z } from "zod";

// Types
type Document = z.infer<typeof api.documents.list.responses[200]>[number];

export function useDocuments() {
  return useQuery({
    queryKey: [api.documents.list.path],
    queryFn: async () => {
      const res = await authFetch(api.documents.list.path);
      return api.documents.list.responses[200].parse(await res.json());
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      // Note: we don't set Content-Type header manually for FormData,
      // browser sets it with boundary automatically
      const res = await authFetch(api.documents.upload.path, {
        method: api.documents.upload.method,
        body: formData,
      });
      
      return api.documents.upload.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
    },
  });
}
