export interface Project {
  id: string;
  name: string;
  description: string;
  date: string;
  type: "web" | "mobile" | "desktop" | "api";
  iconColor: string;
  iconName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  projectId: string;
  type: "created" | "updated" | "completed";
  description: string;
  createdAt: string;
  userId: string;
}

export interface Note {
  id: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  url: string;
  projectId: string;
}

export type Role = "user" | "admin";

export interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: string; // ISO
  isLoading?: boolean;
}

export interface Chat {
  id: string;
  projectId: string;
  title?: string;
  messages: Message[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface Profile {
  uid: string;
  id: string;
  role: Role;
  displayName: string | null;
  email: string;
  phoneNumber: string | null;
  photoURL: string | null;
  color: string; // Couleur aléatoire d'avatar (ex: "#3498db")
  createdAt: string;
}

export type ProjectMemberRole = "owner" | "editor" | "reader" | "guest";

export interface Invitation {
  id: string;
  projectId: string;
  projectOwnerId: string;
  guestUserId: string;
  guestUserRole: ProjectMemberRole;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  respondedAt?: string;
}

export interface Member {
  id: string;
  projectId: string;
  userId: string;
  userRole: ProjectMemberRole;
  invitationId: string;
  createdAt: string;
}
