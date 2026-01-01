import { apiClient } from "./apiClient";

export interface InvitationCreateRequest {
  duration_days: number;
  max_uses: number;
  expires_at?: string | null;
  scope: "admin" | "demo" | "paid_access" | "basic_access" | "read_only";
}

export interface Invitation {
  id: number;
  code: string;
  duration_days: number;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  scope: "admin" | "demo" | "paid_access" | "basic_access" | "read_only";
  created_at: string;
}

export const createInvitation = (data: InvitationCreateRequest) => {
  return apiClient.post<Invitation>("/admin/invitations", data);
};

export const listInvitations = () => {
  return apiClient.get<Invitation[]>("/admin/invitations");
};
