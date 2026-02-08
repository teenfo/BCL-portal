import NoticeDetailClient from "./NoticeDetailClient";

export const generateStaticParams = () => [];
export const dynamic = "force-static";

export default function NoticeDetailPage({ params }) {
    return <NoticeDetailClient params={params} />;
}
