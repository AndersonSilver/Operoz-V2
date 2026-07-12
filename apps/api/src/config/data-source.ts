import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./env.js";
import { User } from "../entities/user.entity.js";
import { Profile } from "../entities/profile.entity.js";
import { Account } from "../entities/account.entity.js";
import { Workspace } from "../entities/workspace.entity.js";
import { WorkspaceMember } from "../entities/workspace-member.entity.js";
import { WorkspaceInvite } from "../entities/workspace-invite.entity.js";
import { WorkspaceUserProperties } from "../entities/workspace-user-properties.entity.js";
import { WorkspaceTheme } from "../entities/workspace-theme.entity.js";
import { Project } from "../entities/project.entity.js";
import { ProjectMember } from "../entities/project-member.entity.js";
import { ProjectInvite } from "../entities/project-invite.entity.js";
import { Favorite } from "../entities/favorite.entity.js";
import { State } from "../entities/state.entity.js";
import { Label } from "../entities/label.entity.js";
import { Estimate } from "../entities/estimate.entity.js";
import { EstimatePoint } from "../entities/estimate-point.entity.js";
import { Issue } from "../entities/issue.entity.js";
import { IssueAssignee } from "../entities/issue-assignee.entity.js";
import { IssueLabel } from "../entities/issue-label.entity.js";
import { IssueActivity } from "../entities/issue-activity.entity.js";
import { DraftIssue } from "../entities/draft-issue.entity.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  // Nunca deixar o TypeORM alterar o schema automaticamente — migrations
  // são a única fonte de verdade, inclusive em desenvolvimento.
  synchronize: false,
  logging: env.isDevelopment ? ["error", "warn", "migration"] : ["error"],
  entities: [
    User,
    Profile,
    Account,
    Workspace,
    WorkspaceMember,
    WorkspaceInvite,
    WorkspaceUserProperties,
    WorkspaceTheme,
    Project,
    ProjectMember,
    ProjectInvite,
    Favorite,
    State,
    Label,
    Estimate,
    EstimatePoint,
    Issue,
    IssueAssignee,
    IssueLabel,
    IssueActivity,
    DraftIssue,
  ],
  migrations: [env.isProduction ? "dist/migrations/*.js" : "src/migrations/*.ts"],
  migrationsTableName: "migrations_history",
});
