import { AssetRecordType, TLAsset, TLAssetStore, TLBookmarkAsset, getHashForString, uniqueId } from "tldraw";

// Base URL of the Cloudflare sync worker (see sync-worker/), e.g. https://unsorted-sync.<you>.workers.dev
export const SYNC_URL = (process.env.NEXT_PUBLIC_SYNC_URL ?? "").replace(/\/$/, "");

// There's one board, shared by everyone who opens the site.
export const ROOM_ID = "unsorted";

export const CONNECT_URI = `${SYNC_URL}/api/connect/${ROOM_ID}`;

// Images/videos are uploaded to R2 via the worker and served back from the same URL.
export const assetStore: TLAssetStore = {
  async upload(_asset, file) {
    const objectName = `${uniqueId()}-${file.name}`.replace(/[^a-zA-Z0-9.]/g, "-");
    const url = `${SYNC_URL}/api/uploads/${objectName}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) throw new Error(`Failed to upload asset: ${res.statusText}`);

    return { src: url };
  },
  resolve(asset) {
    return asset.props.src;
  },
};

export async function getBookmarkPreview({ url }: { url: string }): Promise<TLAsset> {
  const asset: TLBookmarkAsset = {
    id: AssetRecordType.createId(getHashForString(url)),
    typeName: "asset",
    type: "bookmark",
    meta: {},
    props: { src: url, description: "", image: "", favicon: "", title: "" },
  };

  try {
    const res = await fetch(`${SYNC_URL}/api/unfurl?url=${encodeURIComponent(url)}`);
    const data: any = await res.json();
    asset.props.description = data?.description ?? "";
    asset.props.image = data?.image ?? "";
    asset.props.favicon = data?.favicon ?? "";
    asset.props.title = data?.title ?? "";
  } catch {
    // A bookmark without a preview is still a bookmark.
  }

  return asset;
}
