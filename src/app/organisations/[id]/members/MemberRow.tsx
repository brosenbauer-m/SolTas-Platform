"use client";

import { useTransition } from "react";

type MemberRowProps = {
  member: {
    user_id: string;
    role: string;
    can_create_projects: boolean;
    can_create_funding: boolean;
  };
  organisationId: string;
  isCurrentUser: boolean;
  updateMemberRole: (formData: FormData) => Promise<void>;
  updateMemberPermission: (formData: FormData) => Promise<void>;
  removeMember: (formData: FormData) => Promise<void>;
};

export function MemberRow({
  member,
  organisationId,
  isCurrentUser,
  updateMemberRole,
  updateMemberPermission,
  removeMember,
}: MemberRowProps) {
  const [isPending, startTransition] = useTransition();
  const isOwner = member.role === "owner";

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const form = e.currentTarget.form;
    if (form) {
      startTransition(() => {
        updateMemberRole(new FormData(form));
      });
    }
  };

  const handlePermissionChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    permission: "can_create_projects" | "can_create_funding"
  ) => {
    const formData = new FormData();
    formData.append("organisation_id", organisationId);
    formData.append("user_id", member.user_id);
    formData.append("permission", permission);
    formData.append("value", e.currentTarget.checked.toString());

    startTransition(() => {
      updateMemberPermission(formData);
    });
  };

  const handleRemove = () => {
    if (confirm("Are you sure you want to remove this member?")) {
      const formData = new FormData();
      formData.append("organisation_id", organisationId);
      formData.append("user_id", member.user_id);

      startTransition(() => {
        removeMember(formData);
      });
    }
  };

  return (
    <tr className={isPending ? "opacity-50" : ""}>
      <td className="px-6 py-4">
        <div className="text-xs text-soltas-muted">{member.user_id}</div>
        {isCurrentUser && <span className="text-xs font-medium text-blue-600">(You)</span>}
      </td>
      <td className="px-6 py-4">
        {isOwner ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            Owner
          </span>
        ) : (
          <form action={updateMemberRole} className="inline-block">
            <input type="hidden" name="organisation_id" value={organisationId} />
            <input type="hidden" name="user_id" value={member.user_id} />
            <select
              name="role"
              defaultValue={member.role}
              onChange={handleRoleChange}
              disabled={isPending}
              className="rounded-full border border-soltas-line bg-white px-2 py-0.5 text-xs font-medium text-soltas-text focus:border-soltas-ocean/50 focus:outline-none focus:ring-2 focus:ring-soltas-ocean/15 disabled:opacity-50"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </form>
        )}
      </td>
      <td className="px-6 py-4">
        {isOwner ? (
          <span className="text-xs text-green-600">✓ Yes</span>
        ) : (
          <input
            type="checkbox"
            checked={member.can_create_projects}
            onChange={(e) => handlePermissionChange(e, "can_create_projects")}
            disabled={isPending}
            className="h-4 w-4 rounded border-soltas-line text-soltas-muted focus:ring-soltas-ocean/15 disabled:opacity-50"
          />
        )}
      </td>
      <td className="px-6 py-4">
        {isOwner ? (
          <span className="text-xs text-green-600">✓ Yes</span>
        ) : (
          <input
            type="checkbox"
            checked={member.can_create_funding}
            onChange={(e) => handlePermissionChange(e, "can_create_funding")}
            disabled={isPending}
            className="h-4 w-4 rounded border-soltas-line text-soltas-muted focus:ring-soltas-ocean/15 disabled:opacity-50"
          />
        )}
      </td>
      <td className="px-6 py-4">
        {!isOwner && !isCurrentUser ? (
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="rounded border border-rose-500 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
          >
            Remove
          </button>
        ) : (
          <span className="text-xs text-soltas-muted">—</span>
        )}
      </td>
    </tr>
  );
}
