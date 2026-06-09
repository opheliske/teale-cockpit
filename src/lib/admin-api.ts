import type {
  AdminUser,
  AdminCompany,
  CreateUserBody,
  UpdateUserBody,
  UpdateCompanyBody,
} from "@/lib/admin-types";

async function call<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Erreur ${res.status}`);
  }
  return data as T;
}

export const adminApi = {
  listUsers: () => call<{ users: AdminUser[] }>("/api/admin/users").then((d) => d.users),
  createUser: (body: CreateUserBody) =>
    call<{ id: string; email: string; password: string }>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateUser: (id: string, body: UpdateUserBody) =>
    call<{ ok: true }>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteUser: (id: string) =>
    call<{ ok: true }>(`/api/admin/users/${id}`, { method: "DELETE" }),

  listCompanies: () =>
    call<{ companies: AdminCompany[] }>("/api/admin/companies").then((d) => d.companies),
  updateCompany: (id: string, body: UpdateCompanyBody) =>
    call<{ ok: true }>(`/api/admin/companies/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCompany: (id: string) =>
    call<{ ok: true }>(`/api/admin/companies/${id}`, { method: "DELETE" }),
};
