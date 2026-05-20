export type FindImageUrlsForQueriesResult = {
  ok: boolean;
  urls: string[];
  providers: string[];
  queries: string[];
};

export type FindImageUrlsForTermResult = FindImageUrlsForQueriesResult & {
  term: string;
};

export function findImageUrlsForQueries(params: {
  queries: string[];
  count?: number;
}): Promise<FindImageUrlsForQueriesResult>;

export function findImageUrlsForTerm(params: {
  term: string;
  count?: number;
  profile?: string;
  preferTransparent?: boolean;
}): Promise<FindImageUrlsForTermResult>;
