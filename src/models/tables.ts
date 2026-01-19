import {
  Activity,
  Chat,
  Invitation,
  Profile,
  Project,
  UploadedFile,
  Member,
} from ".";

export type Tables = {
  projects: Project[];
  chats: Chat[];
  activities: Activity[];
  files: UploadedFile[];
  profiles: Profile[];
  invitations: Invitation[];
  members: Member[];
};
