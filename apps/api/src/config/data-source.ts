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
import { IssueComment } from "../entities/issue-comment.entity.js";
import { IssueAttachment } from "../entities/issue-attachment.entity.js";
import { IssueLink } from "../entities/issue-link.entity.js";
import { IssueReaction } from "../entities/issue-reaction.entity.js";
import { CommentReaction } from "../entities/comment-reaction.entity.js";
import { IssueMention } from "../entities/issue-mention.entity.js";
import { IssueSubscriber } from "../entities/issue-subscriber.entity.js";
import { IssueRelation } from "../entities/issue-relation.entity.js";
import { Cycle } from "../entities/cycle.entity.js";
import { CycleIssue } from "../entities/cycle-issue.entity.js";
import { ProjectModule } from "../entities/module.entity.js";
import { ModuleIssue } from "../entities/module-issue.entity.js";
import { ModuleLink } from "../entities/module-link.entity.js";
import { Page } from "../entities/page.entity.js";
import { PageLabel } from "../entities/page-label.entity.js";
import { PageVersion } from "../entities/page-version.entity.js";
import { IssueView } from "../entities/issue-view.entity.js";
import { Notification } from "../entities/notification.entity.js";
import { UserNotificationPreference } from "../entities/user-notification-preference.entity.js";
import { ApiToken } from "../entities/api-token.entity.js";
import { Webhook } from "../entities/webhook.entity.js";
import { WebhookLog } from "../entities/webhook-log.entity.js";
import { AnalyticView } from "../entities/analytic-view.entity.js";
import { ExporterHistory } from "../entities/exporter-history.entity.js";

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
    IssueComment,
    IssueAttachment,
    IssueLink,
    IssueReaction,
    CommentReaction,
    IssueMention,
    IssueSubscriber,
    IssueRelation,
    Cycle,
    CycleIssue,
    ProjectModule,
    ModuleIssue,
    ModuleLink,
    Page,
    PageLabel,
    PageVersion,
    IssueView,
    Notification,
    UserNotificationPreference,
    ApiToken,
    Webhook,
    WebhookLog,
    AnalyticView,
    ExporterHistory,
  ],
  migrations: [env.isProduction ? "dist/migrations/*.js" : "src/migrations/*.ts"],
  migrationsTableName: "migrations_history",
});
