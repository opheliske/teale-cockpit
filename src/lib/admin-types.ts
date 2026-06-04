// Shared shapes between the /api/admin route handlers and the /admin UI.

export type ManagedRole = "csm" | "client";

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: "csm" | "client" | "admin";
  clientId: string | null;
  clientName: string | null;
  lastSignInAt: string | null;
  disabled: boolean;
  createdAt: string | null;
};

export type AdminCompany = {
  id: string;
  name: string;
  initials: string;
  color: string;
  ownerCsmId: string | null;
  ownerCsmName: string | null;
  userCount: number;
};

// Request bodies
export type CreateUserBody = {
  email: string;
  role: ManagedRole;
  clientId?: string | null;
  fullName?: string;
};

export type UpdateUserBody = {
  fullName?: string;
  email?: string;
  role?: ManagedRole;
  clientId?: string | null;
  password?: string;
  disabled?: boolean;
};

export type CreateCompanyBody = {
  name: string;
  ownerCsmId: string;
  initials?: string;
  color?: string;
};

export type UpdateCompanyBody = {
  name?: string;
  initials?: string;
  color?: string;
  ownerCsmId?: string;
};
