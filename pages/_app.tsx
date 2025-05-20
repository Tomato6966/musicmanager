import { AppProps } from "next/app";

import { AudioPlayerProvider } from "../contexts/AudioPlayerContext";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AudioPlayerProvider>
      <Component {...pageProps} />
    </AudioPlayerProvider>
  );
}

export default MyApp;
