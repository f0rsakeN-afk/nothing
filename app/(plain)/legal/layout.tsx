import { Footer } from "@/components/marketing/shared/footer";
import { ColorSchemeManager } from "@/components/shared/ColorSchemeManager";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ColorSchemeManager />
      {children}
      <Footer />
    </>
  );
}
