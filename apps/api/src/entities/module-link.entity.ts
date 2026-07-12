import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { ProjectModule } from "./module.entity.js";

@Entity({ name: "module_links" })
export class ModuleLink extends BaseEntity {
  @ManyToOne(() => ProjectModule, { onDelete: "CASCADE" })
  @JoinColumn({ name: "moduleId" })
  module!: ProjectModule;

  @Column({ type: "uuid" })
  moduleId!: string;

  @Column({ type: "text" })
  url!: string;

  @Column({ type: "text", nullable: true })
  title!: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, unknown>;
}
