import { Asset } from "../../entities/asset.entity.js";

export function serializeAsset(asset: Asset, slug: string) {
  return {
    id: asset.id,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    size: asset.size,
    url: `/workspaces/${slug}/assets/${asset.id}/content`,
    createdAt: asset.createdAt,
  };
}
