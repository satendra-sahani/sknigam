/**
 * Politician self-service: manage own staff + assign them to scoped booths.
 *
 * All endpoints are server-side scoped to the logged-in politician.  The
 * mobile app never sends `managedBy` or politicianId — the API derives
 * them from the auth token.  These calls assume the user is logged in as
 * role='politician'; calling them as staff or super_admin will silently
 * fall back to whatever that role's scope returns.
 */
import api from './api';

export interface ManagedStaff {
  _id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  assemblyConstituency?: string;
  district?: string;
  managedBy?: string;
  createdAt: string;
}

export interface AssignableBooth {
  _id: string;
  partNumber: number;
  name: string;
  assemblyConstituency: string;
  district?: string;
  pollingStation?: string;
}

export interface PoliticianMe {
  _id: string;
  name: string;
  email: string;
  phone: string;
  assemblyConstituency?: string;
  district?: string;
  partyAffiliation?: string;
  assignedBoothCount: number;
  managedStaffCount: number;
}

export interface PoliticianAssignment {
  _id: string;
  boothId: string;
  staffId: string;
  voterSerialFrom?: number;
  voterSerialTo?: number;
  isActive: boolean;
  totalVoters: number;
  completedCount: number;
  booth?: { _id: string; partNumber: number; name: string };
  staff?: { _id: string; name: string; phone: string };
  createdAt: string;
}

export async function fetchMyProfile(): Promise<PoliticianMe> {
  const { data } = await api.get<{ data: PoliticianMe }>('/politicians/me');
  return data.data;
}

export async function fetchMyBooths(): Promise<AssignableBooth[]> {
  const { data } = await api.get<{ data: AssignableBooth[] }>('/politicians/me/booths');
  return data.data;
}

export async function fetchMyStaff(): Promise<ManagedStaff[]> {
  // Server filters by managedBy = self when role=politician.
  const { data } = await api.get<{ data: { staff: ManagedStaff[] } }>('/staff', {
    params: { limit: 100 },
  });
  return data.data.staff;
}

export interface StaffCreateInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export async function createStaff(input: StaffCreateInput): Promise<ManagedStaff> {
  const { data } = await api.post<{ data: ManagedStaff }>('/staff', input);
  return data.data;
}

export interface StaffUpdateInput {
  name?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

export async function updateStaff(
  staffId: string,
  patch: StaffUpdateInput,
): Promise<ManagedStaff> {
  const { data } = await api.put<{ data: ManagedStaff }>(`/staff/${staffId}`, patch);
  return data.data;
}

export async function resetStaffPassword(staffId: string, password: string): Promise<void> {
  await api.post(`/staff/${staffId}/password`, { password });
}

export async function deactivateStaff(staffId: string): Promise<void> {
  await api.delete(`/staff/${staffId}`);
}

export interface AssignInput {
  staffId: string;
  boothId: string;
  voterSerialFrom?: number;
  voterSerialTo?: number;
}

export async function assignStaffToBooth(input: AssignInput): Promise<PoliticianAssignment> {
  const { data } = await api.post<{ data: PoliticianAssignment }>(
    '/voter-assignments',
    input,
  );
  return data.data;
}

export async function fetchMyAssignments(
  staffId?: string,
): Promise<PoliticianAssignment[]> {
  const { data } = await api.get<{ data: { assignments: PoliticianAssignment[] } }>(
    '/voter-assignments',
    { params: staffId ? { staffId, isActive: 'true' } : { isActive: 'true' } },
  );
  return data.data.assignments;
}

export async function deactivateAssignment(assignmentId: string): Promise<void> {
  await api.put(`/voter-assignments/${assignmentId}/deactivate`);
}
