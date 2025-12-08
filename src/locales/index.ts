import { en } from "./en";
import { rw } from "./rw";

export const translations = {
  en,
  rw,
};

export type Language = keyof typeof translations;