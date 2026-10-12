import { redirect } from "next/navigation";

// The organisation directory lives at /find-organisations.
export default function OrganisationsPage() {
  redirect("/find-organisations");
}
