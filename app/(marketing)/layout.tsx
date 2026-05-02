import { MarketingHeader } from "@/components/marketing/shared/header";
import { Footer } from "@/components/marketing/shared/footer";
import { ColorSchemeManager } from "@/components/shared/ColorSchemeManager";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ColorSchemeManager />
      <MarketingHeader />
      {children}
      <Footer />
    </>
  );
}
