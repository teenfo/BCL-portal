import MemberDetailClient from "./MemberDetailClient";

export const generateStaticParams = () => [];
export const dynamic = "force-static";

export default function MemberDetailPage({ params }) {
    return <MemberDetailClient params={params} />;
}
