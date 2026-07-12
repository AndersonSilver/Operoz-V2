import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { ProjectModule } from "./module.entity.js";
import { Issue } from "./issue.entity.js";

/** M:N livre — diferente de CycleIssue, uma issue pode estar em vários módulos ao mesmo tempo. */
@Entity({ name: "module_issues" })
@Index(["moduleId", "issueId"], { unique: true, where: '"deletedAt" IS NULL' })
export class ModuleIssue extends BaseEntity {
  @ManyToOne(() => ProjectModule, { onDelete: "CASCADE" })
  @JoinColumn({ name: "moduleId" })
  module!: ProjectModule;

  @Column({ type: "uuid" })
  moduleId!: string;

  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue!: Issue;

  @Column({ type: "uuid" })
  issueId!: string;
}
