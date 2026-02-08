import SessionDetailClient from "./SessionDetailClient";

export const generateStaticParams = () => [];
export const dynamic = "force-static";

export default function SessionDetailPage({ params }) {
    return <SessionDetailClient params={params} />;
}
