export function AdminBadge({ role }: { role: string | null | undefined }) {
  return role === "admin" ? <span className="admin-badge">Admin</span> : null;
}
