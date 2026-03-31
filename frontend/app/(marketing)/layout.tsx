import { MarketingHeader } from "@/components/marketing/shared/header";
import { Footer } from "@/components/marketing/shared/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketingHeader />
      {children}
      <Footer />
    </>
  );
}
