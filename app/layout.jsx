import "./globals.css";
import { StoreProvider } from "@/components/store";
import { Shell } from "@/components/shell";
import { Toaster } from "sonner";
export const metadata = {
  title: "ChallengeHub AI — Ideas meet impact",
  description: "Turn vague business problems into student-ready challenges.",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <Shell>{children}</Shell>
          <Toaster richColors position="bottom-right" closeButton />
        </StoreProvider>
      </body>
    </html>
  );
}
