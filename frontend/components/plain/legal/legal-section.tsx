export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="py-8 first:pt-0 last:pb-0 scroll-mt-20">
      <h2 className="text-sm font-semibold text-foreground mb-4 tracking-tight">{title}</h2>
      <div className="flex flex-col gap-3 text-sm text-muted-foreground leading-relaxed [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_ul]:list-disc [&_li::marker]:text-border">
        {children}
      </div>
    </section>
  );
}
