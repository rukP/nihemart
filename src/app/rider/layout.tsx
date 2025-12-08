import type { Metadata } from "next";
import { ReactNode } from "react";
import RiderLayoutClient from "./layout-client";


export const metadata: Metadata = {
   title: "Rider Dashboard",
   description: "Porogaramu y'umugenzuzi — amakuru y'ibyo gutwara, imirimo n'itumanaho rya Nihemart.",
};

interface LayoutProps {
   children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
   return <RiderLayoutClient>{children}</RiderLayoutClient>;
}