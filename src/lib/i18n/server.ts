import { cookies } from "next/headers";
import { dictionaries, type Dict, type Locale } from "./dictionaries";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get("locale")?.value === "id" ? "id" : "en";
}

export async function getDict(): Promise<Dict> {
  return dictionaries[await getLocale()];
}
