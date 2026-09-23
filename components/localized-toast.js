"use client";
import { toast as sonner } from "sonner";
import { translate } from "./locale";
const message = (value) =>
  translate(
    value,
    typeof document === "undefined" ? "ru" : document.documentElement.lang,
  );
export const toast = Object.fromEntries(
  ["success", "error", "info", "warning"].map((kind) => [
    kind,
    (value, options) => sonner[kind](message(value), options),
  ]),
);
