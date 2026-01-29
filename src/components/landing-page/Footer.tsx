import Link from "next/link";
import { FC } from "react";
import { Icons } from "../icons";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface FooterProps {}

const footerLinks = [
  {
    title: "Company",
    links: [
      { label: "Home", href: "/" },
      { label: "About Us", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "How To Buy", href: "/how-to-buy" },
      { label: "Returns & Refunds Policy", href: "/returns" },
    ],
  },
  {
    title: "Shop",
    links: [
      { label: "Products", href: "/products" },
      { label: "Cart", href: "/cart" },
      { label: "Orders", href: "/orders" },
      { label: "Wishlist", href: "/wishlist" },
      { label: "Notifications", href: "/notifications" },
    ],
  },
  {
    title: "Customer Service",
    links: [
      { label: "Profile", href: "/profile" },
      { label: "Customer Support", href: "/contact" },
      { label: "Returns & Refunds", href: "/returns" },
      { label: "Terms of Service", href: "/" },
      { label: "Privacy Policy", href: "/" },
    ],
  },
];

const socialLinks = [
  {
    icon: Icons.landingPage.instagram,
    href: "https://www.instagram.com/nihe_mart/",
    label: "Instagram",
  },
  {
    icon: Icons.landingPage.facebook,
    href: "https://web.facebook.com/profile.php?id=61554500515881#",
    label: "Facebook",
  },
  {
    icon: Icons.landingPage.tiktok,
    href: "https://www.tiktok.com/@nihe_mart",
    label: "TikTok",
  },
  {
    icon: Icons.landingPage.youtube,
    href: "https://youtube.com/@nihemart?si=ekAIqtCjygt9hgTW",
    label: "YouTube",
  },
];

const Footer: FC<FooterProps> = ({}) => {
  return (
    <footer className="bg-neutral-950 text-white pt-16 pb-8 mt-24 border-t border-neutral-800">
      <MaxWidthWrapper size="lg" className="flex flex-col gap-12">
        {/* Top: Customer Care & Social */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <h5 className="text-2xl font-semibold mb-3">Customer care</h5>
            <p className="text-neutral-400 mb-4 max-w-md">
              Need help? Our support team is available Mon–Sun, 9am–9pm.
            </p>

            {/* <div className="flex gap-3">
              <a
                href="https://apps.apple.com/us/app/nihemart/idXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-neutral-900 border border-neutral-800 px-3 py-2 rounded text-sm hover:bg-neutral-880"
              >
                App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.nihemart"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-neutral-900 border border-neutral-800 px-3 py-2 rounded text-sm hover:bg-neutral-880"
              >
                Google Play
              </a>
            </div> */}
          </div>

          <div className="flex flex-col items-start md:items-end gap-3">
            <span className="font-semibold text-lg mb-1">Follow us</span>
            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="hover:text-brand-orange transition-colors"
                >
                  <Icon className="h-7 w-7" />
                </Link>
              ))}
            </div>
          </div>
        </div>
        {/* Middle: Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 border-t border-neutral-800 pt-10">
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h6 className="text-lg font-bold mb-4">{section.title}</h6>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-neutral-300 hover:text-brand-orange transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Bottom: Copyright */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-neutral-800 pt-8 text-neutral-400 text-sm">
          <span>
            © {new Date().getFullYear()} NiheMart. All rights reserved.
          </span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-brand-orange">
              Privacy Policy
            </Link>
            <span className="hidden md:inline">|</span>
            <Link href="/terms" className="hover:text-brand-orange">
              Terms of Service
            </Link>
          </div>
        </div>
      </MaxWidthWrapper>
    </footer>
  );
};

export default Footer;
