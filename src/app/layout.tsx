import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NEXTGEN TTS",
  description: "Neural Burmese Synthesizer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="my">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
