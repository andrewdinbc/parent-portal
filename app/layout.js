import DevModePanel from "../developer-mode/DevModePanel";

export const metadata = { title:"parent-portal", description:"Secure student work sharing portal for parent-teacher communication with AI-generated summaries." };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
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
      </body>
    </html>
  );
}
