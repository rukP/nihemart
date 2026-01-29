import NavBar from "@/components/landing-page/NavBar";
import AnnouncementBar from "@/components/landing-page/AnnouncementBar";
import Footer from "@/components/landing-page/Footer";
import "../globals.css";

// Using system fonts instead of Google Fonts to avoid network dependencies
const geistSans = {
  variable: "--font-geist-sans",
};

const geistMono = {
  variable: "--font-geist-mono",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AnnouncementBar />
      <NavBar />
      {children}
      <Footer />
    </>
  );
}
