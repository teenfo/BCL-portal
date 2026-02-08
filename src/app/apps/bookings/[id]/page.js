import BookingDetailClient from "./BookingDetailClient";

export const generateStaticParams = () => [];
export const dynamic = "force-static";

export default function BookingDetailPage({ params }) {
    return <BookingDetailClient params={params} />;
}
