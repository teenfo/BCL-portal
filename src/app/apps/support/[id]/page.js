import TicketDetailClient from "./TicketDetailClient";

export const generateStaticParams = () => [];
export const dynamic = "force-static";

export default function TicketDetailPage({ params }) {
    return <TicketDetailClient params={params} />;
}
