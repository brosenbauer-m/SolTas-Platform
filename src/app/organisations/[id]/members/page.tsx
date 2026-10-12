import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getServerSupabase } from "@/lib/supabaseServer";
import { MemberRequestsTab } from "./MemberRequestsTab";

type Member = {
  user_id: string;
  role: string;
  can_create_projects: boolean;
  can_create_funding: boolean;
  created_at: string | null;
  user_email?: string | null;
};

type MemberRequest = {
  id: string;
  user_id: string;
  status: string;
  message: string | null;
  created_at: string;
};

async function updateMemberRole(formData: FormData) {
  "use server";

  const organisationId = formData.get("organisation_id");
  const userId = formData.get("user_id");
  const role = formData.get("role");

  if (typeof organisationId !== "string" || !organisationId) {
    throw new Error("Missing organisation id.");
  }

  if (typeof userId !== "string" || !userId) {
    throw new Error("Missing user id.");
  }

  if (role !== "member" && role !== "admin") {
    throw new Error("Invalid role.");
  }

  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Check if the current user is an admin/owner of this org
  const { data: currentMember } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", organisationId)
    .eq("user_id", auth.user.id)
    .single();

  if (!currentMember || (currentMember.role !== "admin" && currentMember.role !== "owner")) {
    throw new Error("Unauthorized");
  }

  // Update the role and set default permissions based on role
  const { error } = await supabase
    .from("organisation_members")
    .update({
      role,
      can_create_projects: role === "admin",
      can_create_funding: role === "admin",
    })
    .eq("organisation_id", organisationId)
    .eq("user_id", userId);

  if (error) throw error;

  revalidatePath(`/organisations/${organisationId}/members`);
}

async function updateMemberPermission(formData: FormData) {
  "use server";

  const organisationId = formData.get("organisation_id");
  const userId = formData.get("user_id");
  const permission = formData.get("permission");
  const value = formData.get("value") === "true";

  if (typeof organisationId !== "string" || !organisationId) {
    throw new Error("Missing organisation id.");
  }

  if (typeof userId !== "string" || !userId) {
    throw new Error("Missing user id.");
  }

  if (permission !== "can_create_projects" && permission !== "can_create_funding") {
    throw new Error("Invalid permission.");
  }

  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Check if the current user is an admin/owner of this org
  const { data: currentMember } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", organisationId)
    .eq("user_id", auth.user.id)
    .single();

  if (!currentMember || (currentMember.role !== "admin" && currentMember.role !== "owner")) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("organisation_members")
    .update({ [permission]: value })
    .eq("organisation_id", organisationId)
    .eq("user_id", userId);

  if (error) throw error;

  revalidatePath(`/organisations/${organisationId}/members`);
}

async function removeMember(formData: FormData) {
  "use server";

  const organisationId = formData.get("organisation_id");
  const userId = formData.get("user_id");

  if (typeof organisationId !== "string" || !organisationId) {
    throw new Error("Missing organisation id.");
  }

  if (typeof userId !== "string" || !userId) {
    throw new Error("Missing user id.");
  }

  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Check if the current user is an admin/owner of this org
  const { data: currentMember } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", organisationId)
    .eq("user_id", auth.user.id)
    .single();

  if (!currentMember || (currentMember.role !== "admin" && currentMember.role !== "owner")) {
    throw new Error("Unauthorized");
  }

  // Prevent removing owner
  const { data: targetMember } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", organisationId)
    .eq("user_id", userId)
    .single();

  if (targetMember?.role === "owner") {
    throw new Error("Cannot remove the owner.");
  }

  const { error } = await supabase
    .from("organisation_members")
    .delete()
    .eq("organisation_id", organisationId)
    .eq("user_id", userId);

  if (error) throw error;

  revalidatePath(`/organisations/${organisationId}/members`);
}

async function approveMemberRequest(formData: FormData) {
  "use server";

  const organisationId = formData.get("organisation_id");
  const requestId = formData.get("request_id");
  const userId = formData.get("user_id");

  if (typeof organisationId !== "string" || !organisationId) {
    throw new Error("Missing organisation id.");
  }

  if (typeof requestId !== "string" || !requestId) {
    throw new Error("Missing request id.");
  }

  if (typeof userId !== "string" || !userId) {
    throw new Error("Missing user id.");
  }

  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Check if the current user is an admin with can_manage_members permission
  const { data: currentMember } = await supabase
    .from("organisation_members")
    .select("role, can_manage_members")
    .eq("organisation_id", organisationId)
    .eq("user_id", auth.user.id)
    .single();

  if (
    !currentMember ||
    currentMember.role !== "admin" ||
    !currentMember.can_manage_members
  ) {
    throw new Error("Unauthorized - requires admin with can_manage_members permission");
  }

  // Update the request status to approved (RLS policy will enforce permissions)
  const { error: updateError } = await supabase
    .from("organisation_member_requests")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
    })
    .eq("id", requestId)
    .eq("organisation_id", organisationId);

  if (updateError) {
    throw new Error(`Failed to approve request: ${updateError.message}`);
  }

  // Create the organisation_members row with role='member' and minimal permissions
  const { error: insertError } = await supabase
    .from("organisation_members")
    .insert({
      organisation_id: organisationId,
      user_id: userId,
      role: "member",
      can_create_projects: false,
      can_create_funding: false,
      can_create_issues: false,
      can_post_feed: false,
      can_manage_members: false,
    });

  if (insertError) {
    // Check if it's a duplicate key error
    if (insertError.code === "23505") {
      // User is already a member, just update the request status
      console.log("User is already a member, request marked as approved");
    } else {
      // Rollback the request status update by setting it back to pending
      await supabase
        .from("organisation_member_requests")
        .update({
          status: "pending",
          reviewed_at: null,
          reviewed_by: null,
        })
        .eq("id", requestId);

      throw new Error(`Failed to create membership: ${insertError.message}`);
    }
  }

  revalidatePath(`/organisations/${organisationId}/members`);
}

async function rejectMemberRequest(formData: FormData) {
  "use server";

  const organisationId = formData.get("organisation_id");
  const requestId = formData.get("request_id");
  const adminNotes = formData.get("admin_notes");

  if (typeof organisationId !== "string" || !organisationId) {
    throw new Error("Missing organisation id.");
  }

  if (typeof requestId !== "string" || !requestId) {
    throw new Error("Missing request id.");
  }

  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Check if the current user is an admin with can_manage_members permission
  const { data: currentMember } = await supabase
    .from("organisation_members")
    .select("role, can_manage_members")
    .eq("organisation_id", organisationId)
    .eq("user_id", auth.user.id)
    .single();

  if (
    !currentMember ||
    currentMember.role !== "admin" ||
    !currentMember.can_manage_members
  ) {
    throw new Error("Unauthorized - requires admin with can_manage_members permission");
  }

  // Update the request status to rejected (RLS policy will enforce permissions)
  const { error } = await supabase
    .from("organisation_member_requests")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
      admin_notes:
        typeof adminNotes === "string" && adminNotes ? adminNotes : null,
    })
    .eq("id", requestId)
    .eq("organisation_id", organisationId);

  if (error) {
    throw new Error(`Failed to reject request: ${error.message}`);
  }

  revalidatePath(`/organisations/${organisationId}/members`);
}

export default async function OrganisationMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id || typeof id !== "string") notFound();

  const supabase = await getServerSupabase();

  const { data: organisation, error: orgError } = await supabase
    .from("organisations")
    .select("id,name")
    .eq("id", id)
    .single();

  if (!organisation) {
    notFound();
  }

  if (orgError) {
    throw new Error("Unable to load organisation.");
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) {
    notFound();
  }

  // Check if the current user is an admin/owner of this org
  const { data: currentMember } = await supabase
    .from("organisation_members")
    .select("role, can_manage_members")
    .eq("organisation_id", id)
    .eq("user_id", auth.user.id)
    .single();

  const isOrgAdmin = currentMember?.role === "admin" || currentMember?.role === "owner";
  const canManageMembers = currentMember?.can_manage_members === true;

  if (!isOrgAdmin) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 px-5 pb-20 pt-12">
        <Breadcrumbs
          items={[
            { label: "Organisations", href: "/find-organisations" },
            { label: organisation.name, href: `/organisations/${id}` },
            { label: "Members" },
          ]}
        />

        <div className="space-y-4 text-center">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <svg
                className="h-8 w-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="mb-2 text-xl font-semibold text-soltas-bark">Access Restricted</h1>
            <p className="mb-6 text-sm text-soltas-muted">
              You don&apos;t have permission to manage members for this organisation. Only
              organisation admins and owners can access this page.
            </p>
            <Link
              href={`/organisations/${id}`}
              className="inline-flex items-center justify-center rounded-xl bg-soltas-ocean px-4 py-2 text-sm font-medium text-white hover:bg-soltas-abyssal transition-all duration-200"
            >
              Back to organisation
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Fetch all members
  const { data: members, error: membersError } = await supabase
    .from("organisation_members")
    .select("user_id,role,can_create_projects,can_create_funding,created_at")
    .eq("organisation_id", id)
    .order("created_at", { ascending: true });

  if (membersError) {
    throw new Error("Unable to load members.");
  }

  // Fetch pending member requests (only if admin can manage members)
  const { data: memberRequests } = canManageMembers
    ? await supabase
        .from("organisation_member_requests")
        .select("id, user_id, status, message, created_at")
        .eq("organisation_id", id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
    : { data: null };

  const typedMembers = (members ?? []) as Member[];
  const typedRequests = (memberRequests ?? []) as MemberRequest[];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-5 pb-20 pt-12">
      <Breadcrumbs
        items={[
          { label: "Organisations", href: "/find-organisations" },
          { label: organisation.name, href: `/organisations/${id}` },
          { label: "Members" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-[#1A2B38]">Manage members</h1>
          <p className="text-sm text-soltas-muted">
            Manage roles and permissions for{" "}
            <Link href={`/organisations/${id}`} className="font-medium text-soltas-ocean hover:underline">
              {organisation.name}
            </Link>
          </p>
        </div>
        <Link
          href={`/organisations/${id}`}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-soltas-bark hover:bg-slate-50"
        >
          Back to organisation
        </Link>
      </div>

      {/* Tabs Section */}
      <MemberRequestsTab
        organisationId={id}
        members={typedMembers}
        requests={typedRequests}
        canManageMembers={canManageMembers}
        currentUserId={auth.user.id}
        updateMemberRole={updateMemberRole}
        updateMemberPermission={updateMemberPermission}
        removeMember={removeMember}
        approveMemberRequest={approveMemberRequest}
        rejectMemberRequest={rejectMemberRequest}
      />
    </main>
  );
}
