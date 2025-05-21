// pages/index.tsx
import Head from "next/head";

import AudioPlayer from "../components/AudioPlayer";

export default function Home() {
  return (
    <div className="flex flex-col justify-center min-h-screen bg-gray-950 p-8">
      <Head>
        <title>Music Manager</title>
      </Head>
      <AudioPlayer />
    </div>
  );
}
