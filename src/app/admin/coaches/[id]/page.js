import CoachDetailClient from "./CoachDetailClient";

export const generateStaticParams = () => [];
export const dynamic = "force-static";

export default function CoachDetailPage({ params }) {
    return <CoachDetailClient params={params} />;
}
