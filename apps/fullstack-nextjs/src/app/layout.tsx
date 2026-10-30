import Link from "next/link";
import {AppNav} from "@/components/app-nav";
import "./globals.css";
export const metadata = {
  title: "LOGESSA",
  description: "Tasarım ve master dosya yönetimi",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <a className="skip-link" href="#main-content">İçeriğe geç</a>
        <aside>
          <Link className="brand" href="/studio">
            LOGESSA
          </Link>
          <AppNav />
        </aside>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
