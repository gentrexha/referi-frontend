const RAW = import.meta.env.VITE_REFERI_API_URL;
if (!RAW) {
  throw new Error(
    "VITE_REFERI_API_URL is not set — add it to .env.local or your Cloudflare Pages env",
  );
}
export const API_BASE_URL: string = RAW.replace(/\/+$/, "");
