import "./globals.css";

export const metadata = {
  title: "BCL Portal",
  description: "Next-generation Facility Management & Member Portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
