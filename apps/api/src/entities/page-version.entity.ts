import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Page } from "./page.entity.js";
import { User } from "./user.entity.js";

/** Snapshot somente-leitura, com endpoint de restore (lacuna do original — a UI prometia, o backend não tinha). */
@Entity({ name: "page_versions" })
export class PageVersion extends BaseEntity {
  @ManyToOne(() => Page, { onDelete: "CASCADE" })
  @JoinColumn({ name: "pageId" })
  page!: Page;

  @Column({ type: "uuid" })
  pageId!: string;

  @Column({ type: "jsonb", default: {} })
  descriptionJson!: Record<string, unknown>;

  @Column({ type: "text", default: "<p></p>" })
  descriptionHtml!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "savedById" })
  savedBy!: User | null;

  @Column({ type: "uuid", nullable: true })
  savedById!: string | null;
}
