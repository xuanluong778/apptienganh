import "./globals.css";
import { Oswald, Roboto } from "next/font/google";
import AppProviders from "@/components/AppProviders";
import GuestGateProvider from "@/components/GuestGateProvider";
import DictionarySearchBar from "@/components/DictionarySearchBar";
import KidMainNav from "@/components/KidMainNav";
import TrialCountdown from "@/components/TrialCountdown";
import UpgradeMenu from "@/components/billing/UpgradeMenu";
import BottomAccountDock from "@/components/account/BottomAccountDock";

const roboto = Roboto({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: true
});

const oswald = Oswald({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-heading",
  preload: true
});

export const metadata = {
  title: "Ứng dụng tiếng Anh cho bé",
  description: "Học tiếng Anh qua từ vựng và trò chơi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${roboto.className} ${oswald.variable}`}>
        <AppProviders>
          <GuestGateProvider>
            <div className="kid-nav-sticky-block">
              <header className="kid-nav-wrap">
                <div className="kid-nav-toolbar kid-nav-toolbar--main">
                  <KidMainNav />
                </div>
                <div className="kid-nav-upgrade-corner" aria-label="Nâng cấp tài khoản">
                  <UpgradeMenu />
                  <TrialCountdown placement="corner" />
                </div>
              </header>
              <DictionarySearchBar />
            </div>
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
