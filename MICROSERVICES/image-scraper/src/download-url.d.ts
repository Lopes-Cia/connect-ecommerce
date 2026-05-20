export type DownloadQuality = {
  minBytes?: number;
  minWidth?: number;
  minHeight?: number;
};

export type DownloadItem = {
  ok: boolean;
  term: string;
  url: string;
  savedPath: string;
  bytes: number;
  contentType: string;
  width: number;
  height: number;
  status: number;
  statusText?: string;
  error?: string;
};

export function downloadImageToTermsFolder(params: {
  url: string;
  term: string;
  outDir?: string;
  quality?: DownloadQuality;
}): Promise<DownloadItem>;

export function downloadImagesToTermsFolder(params: {
  urls: string[];
  term: string;
  count?: number;
  outDir?: string;
  quality?: DownloadQuality;
}): Promise<{
  ok: boolean;
  term: string;
  countRequested: number;
  countAttempted: number;
  items: DownloadItem[];
}>;
