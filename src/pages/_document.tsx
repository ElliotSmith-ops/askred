// File: pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <NextScript />
        <script
          data-name="BMC-Widget"
          data-cfasync="false"
          src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js"
          data-id="ElliotS"
          data-description="Support me on Buy me a coffee!"
          data-message="Built by a 2025 Computer Science grad. If this tool helped, a coffee helps me keep improving it — and if you're hiring, share your LinkedIn and let's talk."
          data-color="#5F7FFF"
          data-position="Right"
          data-x_margin="18"
          data-y_margin="18"
        ></script>
      </body>
    </Html>
  );
}
