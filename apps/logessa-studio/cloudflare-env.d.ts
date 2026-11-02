declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ALURA_API_KEY?: string;
    OPENAI_API_KEY?: string;
    OPENAI_TEXT_MODEL?: string;
    OPENAI_IMAGE_MODEL?: string;
  }
}
