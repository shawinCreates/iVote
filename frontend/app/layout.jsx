// layout.jsx
import "../globals.css"; // only import global.css here

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}