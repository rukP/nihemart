import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { ReactNode } from "react";
import { AdminLayoutWrapper } from "@/components/admin/AdminLayoutWrapper";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Imbonerahamwe y'ubuyobozi — reba ibicuruzwa, abakiriya, n'ibindi bikorwa bya Nihemart.",
};

interface LayoutProps {
  children: ReactNode;
}

const layout = ({ children }: LayoutProps) => {
  return (
    <AdminLayoutWrapper>
      <div className="w-full min-h-screen flex bg-white">
        <div className="w-80 border-r bg-surface-secondary border-border-primary h-screen hidden lg:block">
          <Sidebar />
        </div>
        <div className="w-full overflow-auto">
          <TopBar variant="primary" title="Dashboard" />
          {children}
        </div>
      </div>
    </AdminLayoutWrapper>
  );
};

export default layout;
