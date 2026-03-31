import Link from "next/link";
import Image from "next/image";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0 group">
      <Image
        src={"/logo.png"}
        alt="kumari ai logo"
        height={50}
        width={50}
        priority
      />
    </Link>
  );
}
