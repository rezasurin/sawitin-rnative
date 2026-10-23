/** Photos per observation or mill ticket; the backend refuses a sixth. */
export const MAX_FOTO = 5;

/** One photo as `POST /upload` returned it, or a `file://` photo not uploaded yet. */
export interface FotoItem {
  url: string;
  hash?: string | null;
  bytes?: number | null;
}

export const isLocalFoto = (url: string) => url.startsWith('file://');

/** A record's photo URLs, from `foto` or, on rows queued by older builds, the single `foto_url`. */
export const fotoUrls = (row: { foto?: FotoItem[] | null; foto_url?: string | null }) =>
  row.foto ? row.foto.map((item) => item.url) : row.foto_url ? [row.foto_url] : [];

/** The `file://` photos a queued payload owns, deleted once the server has them. */
export const localFotoUris = (foto: FotoItem[]) =>
  foto.filter((item) => isLocalFoto(item.url)).map((item) => item.url);
