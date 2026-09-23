"use client";
import Link from "next/link";
import { useStore } from "./store";
import { workspaceHref } from "@/lib/workspace-routes";

export default function WorkspaceLink({ href, ...props }) {
  const { role } = useStore();
  return <Link href={workspaceHref(href, role)} {...props} />;
}
