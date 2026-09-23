export function routeRole(path) {
  if (path === "/student" || path.startsWith("/student/")) return "Student";
  if (path === "/business" || path.startsWith("/business/")) return "Business";
  return null;
}

export function workspaceHref(href, role) {
  if (
    typeof href !== "string" ||
    !href.startsWith("/") ||
    href.startsWith("//") ||
    routeRole(href)
  )
    return href;
  const root = role === "Student" ? "/student" : "/business";
  if (href === "/") return root;
  if (href.startsWith("/applications"))
    return (
      root +
      (role === "Student" ? "/proposals" : "/applications") +
      href.slice(13)
    );
  if (href === "/my-challenges") return "/business/my-challenges";
  if (href.startsWith("/challenges")) return root + href;
  return href;
}
