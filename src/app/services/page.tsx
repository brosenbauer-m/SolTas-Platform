import { redirect } from "next/navigation";

// Services now live on the About page ("What we do").
export default function ServicesPage() {
  redirect("/about#services");
}
