import { ApiError, failureText } from "./api.js";

const NOTE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type GetNote = (path: string) => Promise<{ text: string }>;

export async function noteLine(value: string, call: GetNote): Promise<string> {
  const id = value.toLowerCase();
  // Checked before any call, so a value like "count" never reaches /api/notes/count.
  if (!NOTE_ID.test(id)) return "not found";
  try {
    return (await call(`/api/notes/${id}`)).text;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return "not found";
    return failureText(error);
  }
}
