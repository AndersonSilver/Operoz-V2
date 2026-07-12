import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Page } from "./page.entity.js";
import { Label } from "./label.entity.js";

@Entity({ name: "page_labels" })
@Index(["pageId", "labelId"], { unique: true, where: '"deletedAt" IS NULL' })
export class PageLabel extends BaseEntity {
  @ManyToOne(() => Page, { onDelete: "CASCADE" })
  @JoinColumn({ name: "pageId" })
  page!: Page;

  @Column({ type: "uuid" })
  pageId!: string;

  @ManyToOne(() => Label, { onDelete: "CASCADE" })
  @JoinColumn({ name: "labelId" })
  label!: Label;

  @Column({ type: "uuid" })
  labelId!: string;
}
