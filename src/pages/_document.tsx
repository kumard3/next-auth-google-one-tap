import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body className="font-poppins">
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <Main />
        <NextScript />
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </body>
    </Html>
  );
}
