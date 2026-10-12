"use client";

import { useState } from "react";
import { MemberRow } from "./MemberRow";

type Member = {
  user_id: string;
  role: string;
  can_create_projects: boolean;
  can_create_funding: boolean;
  created_at: string | null;
};

type MemberRequest = {
  id: string;
  user_id: string;
  status: string;
  message: string | null;
  created_at: string;
};

type Props = {
  organisationId: string;
  members: Member[];
  requests: MemberRequest[];
  canManageMembers: boolean;
  currentUserId: string;
  updateMemberRole: (formData: FormData) => Promise<void>;
  updateMemberPermission: (formData: FormData) => Promise<void>;
  removeMember: (formData: FormData) => Promise<void>;
  approveMemberRequest: (formData: FormData) => Promise<void>;
  rejectMemberRequest: (formData: FormData) => Promise<void>;
};

export function MemberRequestsTab({
  organisationId,
  members,
  requests,
  canManageMembers,
  currentUserId,
  updateMemberRole,
  updateMemberPermission,
  removeMember,
  approveMemberRequest,
  rejectMemberRequest,
}: Props) {
  const [activeTab, setActiveTab] = useState<"members" | "requests">("members");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (request: MemberRequest) => {
    if (!canManageMembers) {
      setError("You don't have permission to approve requests");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("organisation_id", organisationId);
      formData.append("request_id", request.id);
      formData.append("user_id", request.user_id);

      await approveMemberRequest(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (request: MemberRequest) => {
    if (!canManageMembers) {
      setError("You don't have permission to reject requests");
      return;
    }

    const notes = prompt("Optional: Add a note for the rejection");

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("organisation_id", organisationId);
      formData.append("request_id", request.id);
      if (notes) {
        formData.append("admin_notes", notes);
      }

      await rejectMemberRequest(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-soltas-line">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("members")}
            className={`border-b-2 pb-4 text-sm font-medium transition-colors ${
              activeTab === "members"
                ? "border-soltas-ocean text-soltas-ocean"
                : "border-transparent text-soltas-muted hover:border-soltas-line hover:text-soltas-text"
            }`}
          >
            Members ({members.length})
          </button>
          {canManageMembers && (
            <button
              onClick={() => setActiveTab("requests")}
              className={`relative border-b-2 pb-4 text-sm font-medium transition-colors ${
                activeTab === "requests"
                  ? "border-soltas-ocean text-soltas-ocean"
                  : "border-transparent text-soltas-muted hover:border-soltas-line hover:text-soltas-text"
              }`}
            >
              Requests
              {requests.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                  {requests.length}
                </span>
              )}
            </button>
          )}
        </nav>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="rounded-2xl border border-soltas-line bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-sm">
              <thead className="bg-soltas-off-white text-left text-xs font-medium text-soltas-muted">
                <tr>
                  <th className="px-6 py-3">User ID</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Can Create Projects</th>
                  <th className="px-6 py-3">Can Create Funding</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-sm text-soltas-muted"
                    >
                      No members found.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <MemberRow
                      key={member.user_id}
                      member={member}
                      organisationId={organisationId}
                      isCurrentUser={member.user_id === currentUserId}
                      updateMemberRole={updateMemberRole}
                      updateMemberPermission={updateMemberPermission}
                      removeMember={removeMember}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === "requests" && canManageMembers && (
        <div className="rounded-2xl border border-soltas-line bg-white">
          {requests.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-soltas-muted">No pending membership requests.</p>
            </div>
          ) : (
            <div className="divide-y">
              {requests.map((request) => (
                <div key={request.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="font-medium text-soltas-text">
                          User ID: {request.user_id}
                        </h3>
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Pending
                        </span>
                      </div>
                      <p className="text-xs text-soltas-muted">
                        Requested {new Date(request.created_at).toLocaleDateString()}{" "}
                        at {new Date(request.created_at).toLocaleTimeString()}
                      </p>
                      {request.message && (
                        <div className="mt-3 rounded-lg bg-soltas-off-white p-3">
                          <p className="text-xs font-medium text-soltas-muted mb-1">
                            Message:
                          </p>
                          <p className="text-sm text-soltas-text">{request.message}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request)}
                        disabled={isProcessing}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request)}
                        disabled={isProcessing}
                        className="rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
