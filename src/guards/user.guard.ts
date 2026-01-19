import { where } from "firebase/firestore";
import { Profile } from "../models/index";
import { MemberService } from "../services/member.service";

export class UserGuard {
  public static async userIsProjectMember(userId: string, projectId: string) {
    const [isMember] = await MemberService.get([
      where("projectId", "==", projectId),
      where("userId", "==", userId),
    ]);

    return !!isMember;
  }
}
