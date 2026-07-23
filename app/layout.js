import DevModePanel from "../developer-mode/DevModePanel";
import Header from "../components/Header";
import MorpheusChat from "../components/MorpheusChat";

export const metadata = { title:"parent-portal", description:"Secure student work sharing portal for parent-teacher communication with AI-generated summaries." };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
        <footer style={{ padding: "20px 24px", borderTop: "1px solid #e3ddd0", fontSize: 12, color: "#6b6459", textAlign: "center", background: "#f7f5f0" }}>
          <a href="https://morpheus-scheduler.vercel.app/data-residency" target="_blank" rel="noopener noreferrer" style={{ color: "#1c3557", textDecoration: "underline" }}>
            Data Residency &amp; Privacy Disclosure
          </a>
        </footer>
        <DevModePanel
          productName="Student Portfolio and Assignment Tracker"
          sourceRepo="andrewdinbc/parent-portal"
          userEmail="andrewsinbc3@gmail.com"
          userKey="owner"
          morpheusUrl="https://morpheus-scheduler.vercel.app"
          enabled={true}
          audienceLabel="a parent viewing their child's weekly progress, or the teacher managing it"
          mode="personal"
        />
              <MorpheusChat productName="Student Portfolio and Assignment Tracker" />
      </body>
    </html>
  );
}
