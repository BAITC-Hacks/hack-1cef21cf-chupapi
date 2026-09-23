import "./globals.css";
import "./alem.css";
import { LocaleProvider } from "@/components/locale";
import { StoreProvider } from "@/components/store";
import { Shell } from "@/components/shell";
import { Toaster } from "sonner";
export const metadata = {
  title: "ChallengeHub AI — Ideas meet impact",
  description: "Turn vague business problems into student-ready challenges.",
};
export default function RootLayout({ children }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <LocaleProvider>
          <StoreProvider>
            <Shell>{children}</Shell>
            <Toaster richColors position="bottom-right" closeButton />
          </StoreProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
