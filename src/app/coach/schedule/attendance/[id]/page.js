import AttendanceDetailClient from "./AttendanceDetailClient";

export const generateStaticParams = () => [];
export const dynamic = "force-static";

export default function AttendanceDetailPage({ params }) {
    return <AttendanceDetailClient params={params} />;
}
