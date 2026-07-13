import { Asset } from "../../entities/asset.entity.js";
import { Workspace } from "../../entities/workspace.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";
import { WorkspaceRole } from "../../common/roles.js";
import { deleteAssetFile, readAssetFile, writeAssetFile } from "./asset-storage.js";

const MAX_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Allowlist por prefixo — exclusão deliberada de `text/html`,
 * `text/javascript`/`application/javascript` e `image/svg+xml` (SVG pode
 * embutir `<script>`), mesma motivação anti-XSS documentada na pesquisa
 * do original.
 */
const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "application/zip", "text/plain", "text/csv"];
const DENIED_MIME_TYPES = new Set(["image/svg+xml"]);

class AssetService {
  validateMime(mimeType: string): void {
    if (DENIED_MIME_TYPES.has(mimeType) || !ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p))) {
      throw new ApiError(422, "asset_type_not_allowed", "Tipo de arquivo não permitido.");
    }
  }

  async upload(
    workspace: Workspace,
    actor: User,
    input: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<Asset> {
    if (input.buffer.length > MAX_SIZE_BYTES) {
      throw new ApiError(422, "asset_too_large", "Arquivo excede o limite de tamanho permitido.");
    }
    this.validateMime(input.mimeType);

    const fileName = input.fileName.replace(/[/\\]/g, "_").replace(/\.\./g, "_");
    const storageKey = await writeAssetFile(input.buffer);

    return Asset.create({
      workspaceId: workspace.id,
      uploadedById: actor.id,
      storageKey,
      fileName,
      mimeType: input.mimeType,
      size: input.buffer.length,
    }).save();
  }

  async findOrThrow(workspaceId: string, assetId: string): Promise<Asset> {
    const asset = await Asset.findOneBy({ id: assetId, workspaceId });
    if (!asset) throw new ApiError(404, "asset_not_found", "Arquivo não encontrado.");
    return asset;
  }

  async readContent(asset: Asset): Promise<Buffer> {
    return readAssetFile(asset.storageKey);
  }

  async remove(workspace: Workspace, actor: User, requesterRole: WorkspaceRole, assetId: string): Promise<void> {
    const asset = await this.findOrThrow(workspace.id, assetId);
    if (asset.uploadedById !== actor.id && requesterRole < WorkspaceRole.ADMIN) {
      throw new ApiError(403, "insufficient_permission", "Você não pode remover este arquivo.");
    }
    await deleteAssetFile(asset.storageKey);
    await asset.remove();
  }
}

export const assetService = new AssetService();
