"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminMembers, changeAdministrator } from "@/app/admin/actions";
import { useSession } from "./session-provider";
import { AdminBadge } from "./admin-badge";
type Member = { user_id: string; display_name: string; role: string | null };
export function ManageAdmins() {
  const [admins, setAdmins] = useState<Member[]>([]);
  const [matches, setMatches] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<{ member: Member; grant: boolean } | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const { refresh } = useSession();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    void adminMembers("", true).then((r) => { if (active) { setAdmins(r.data); setError(r.error); setLoading(false); } }).catch(() => { if (active) { setError("Unable to load administrators."); setLoading(false); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setMatches([]);
    if (search.trim().length < 2) return;
    const timer = setTimeout(() => {
      void adminMembers(search, false).then((r) => { if (active) { setMatches(r.data); setError(r.error); } }).catch(() => { if (active) setError("Unable to search members."); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);
  async function confirm() {
    if (!pending) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await changeAdministrator(pending.member.user_id, pending.grant);
      if (result.error) { setError(result.error); return; }
      setPending(null); setSearch(""); setMatches([]);
      setMessage("Administrator role updated.");
      await refresh(); router.refresh();
      const list = await adminMembers("", true);
      setAdmins(list.data); if (list.error) setError(list.error);
    } catch { setError("Unable to update administrator access. Please retry."); }
    finally { setBusy(false); }
  }
  return <div>
    <p className="muted about">Choose an existing member by name or account ID. Removing admin access restores their previous organizer role, if any. All changes are logged.</p>
    {error && <p className="error-note" role="alert">{error}</p>}
    {message && <p className="soft-note" role="status">{message}</p>}
    {loading ? <p role="status">Loading administrators…</p> : admins.map((member) => <div className="manage-row" key={member.user_id}>
      <div><h3>{member.display_name}<AdminBadge role="admin" /></h3><p className="small muted">{member.user_id}</p></div>
      <button className="btn outline" disabled={busy || admins.length <= 1} onClick={() => { setPending({ member, grant: false }); setMessage(""); }}>Remove Admin</button>
    </div>)}
    {admins.length === 1 && <p className="muted small">The last administrator cannot be removed.</p>}
    <label className="field-label" htmlFor="admin-member-search">Find a registered member</label>
    <input id="admin-member-search" value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} placeholder="Enter at least two characters of a name or an account ID" />
    {matches.map((member) => <div className="manage-row" key={member.user_id}><div><h3>{member.display_name}<AdminBadge role={member.role} /></h3><p className="small muted">{member.user_id}</p></div><button className="btn" disabled={busy || member.role === "admin"} onClick={() => { setPending({ member, grant: true }); setMessage(""); }}>{member.role === "admin" ? "Already Admin" : "Make Admin"}</button></div>)}
    {pending && <div className="soft-note" role="region" aria-label="Confirm administrator change"><p>{pending.grant ? "Grant administrator access to" : "Remove administrator access from"} {pending.member.display_name} ({pending.member.user_id})?</p><div className="row wrap"><button className="btn" disabled={busy} onClick={() => void confirm()}>{busy ? "Saving…" : "Confirm Change"}</button><button className="btn outline" disabled={busy} onClick={() => setPending(null)}>Cancel</button></div></div>}
  </div>;
}
