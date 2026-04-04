import "./globals.css";
import { Fredoka } from "next/font/google";
import DictionarySearchBar from "@/components/DictionarySearchBar";
import AppProviders from "@/components/AppProviders";
import GuestGateProvider from "@/components/GuestGateProvider";
import KidMainNav from "@/components/KidMainNav";
import TrialCountdown from "@/components/TrialCountdown";
import UpgradeMenu from "@/components/billing/UpgradeMenu";
import BottomAccountDock from "@/components/account/BottomAccountDock";

const fredoka = Fredoka({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const metadata = {
  title: "Ứng dụng tiếng Anh cho bé",
  description: "Học tiếng Anh qua từ vựng và trò chơi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={fredoka.className}>
        <AppProviders>
          <GuestGateProvider>
            <header className="kid-nav-wrap">
              <div className="kid-nav-toolbar kid-nav-toolbar--main">
                <KidMainNav />
              </div>
              <DictionarySearchBar />
              <div className="kid-nav-upgrade-corner" aria-label="Nâng cấp tài khoản">
                <UpgradeMenu />
                <TrialCountdown placement="corner" />
              </div>
            </header>
          </GuestGateProvider>
          <div className="page-content">
            {children}
          </div>
          <BottomAccountDock />
        </AppProviders>
      </body>
    </html>
  );
}
