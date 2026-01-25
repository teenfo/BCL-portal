import { redirect } from "next/navigation";

export default function RootPage() {
  // Logic to determine if user is admin or app user can go here
  // For now, default to apps dashboard
  redirect("/apps/dashboard");
}
