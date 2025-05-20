# Music Manager - Next.js Audio Player with Voice Control

A modern, feature-rich music player built with Next.js that allows you to search for music, manage a queue, and control playback with voice commands.

![Music Manager Screenshot](https://placeholder-for-screenshot.com)

## ✨ Features

- **Music Search & Playback**: Search for songs and play them instantly
- **Queue Management**: Add songs to queue, reorder with drag-and-drop, remove tracks
- **Voice Control**: Hands-free operation using "chrissy" as the wake word
- **Audio Visualization**: Visual representation of the audio being played
- **Responsive Design**: Works on desktop and mobile devices
- **Autoplay**: Automatically play related tracks
- **Persistent Storage**: Your queue and settings are saved between sessions

## 🛠️ Technology Stack

- **Frontend**: Next.js, React, TypeScript
- **UI Components**: React Audio Player, Lucide React icons, React Tooltip
- **Voice Recognition**: Web Speech API
- **Voice Command Processing**: Ollama (LLM-powered command interpretation)
- **State Management**: React Context API
- **Storage**: Browser LocalStorage

## 📋 Prerequisites

- Node.js v18+ (for internal fetch API support)
- [Ollama](https://ollama.ai/) installed and running locally with the `llama3` model
- HTTPS for production (voice recognition requires a secure context)

## 🚀 Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/music-manager.git
   cd music-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Make sure Ollama is running with the llama3 model:
   ```bash
   ollama run llama3
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Usage

### Music Search

1. Type a song name in the search box, if "play" is selected the song will play immediately if you hit the search button or press enter, if enqueue it will be enqueued. You can then also select other search results
2. Press Enter or click the Search button
3. Select a track from the search results to play or add to your queue

### Queue Management

- **Add to Queue**: Click the "+" button on a search result
- **Add to Top of Queue**: Click the arrow up button
- **Reorder**: Drag and drop songs in the queue
- **Remove**: Click the trash icon on a queued song
- **Clear Queue**: Click the clear queue button at the top of the queue
- **Shuffle**: Click the shuffle button to randomize the queue

## 📡 API Endpoints

The application has several backend API endpoints:

- `/api/search`: Searches for songs based on a query
- `/api/autocomplete`: Gets related songs based on a video ID
- `/api/stream`: Streams audio for a given video URL
- `/api/voice-command`: Processes voice commands via Ollama *Check the Voice Recognition section for more information*

### Voice Recognition

*Note: Currently not pushed to the repository due to setup and security issues*
 * It uses Ollama to parse the command and return a JSON object.
 * You can use the new Browser based SpeechRecognition API to get the command from the user.
 * https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
 * Or you can also streamline the recording audio to https://wit.ai
 * I have made a discord bot with that functionality, if you are interested in that https://github.com/Tomato6966/voice-controlled-discord-bot

### Voice Commands

Voice control is activated by saying "chrissy" followed by a command. Available commands:

| Command | Example | Action |
|---------|---------|--------|
| play | "chrissy play bohemian rhapsody" | Searches for the song and plays it immediately |
| search | "chrissy search for hotel california" | Searches for the song and shows results |
| addToQueueTop | "chrissy add stairway to heaven to top of queue" | Adds the song to the top of the queue |
| addToQueueEnd | "chrissy add thunderstruck to queue" | Adds the song to the end of the queue |
| pause | "chrissy pause" | Pauses the current playback |
| resume | "chrissy resume" | Resumes playback |
| skip | "chrissy skip" | Skips to the next song |
| volumeUp | "chrissy volume up" | Increases the volume |
| volumeDown | "chrissy volume down" | Decreases the volume |
| volumeMax | "chrissy max volume" | Sets volume to maximum |
| mute | "chrissy mute" | Toggles mute |
| clearQueue | "chrissy clear queue" | Clears the queue |
| shuffleQueue | "chrissy shuffle queue" | Shuffles the queue |

To use voice control:
1. Click the microphone button in the bottom right corner
2. Say "chrissy" followed by your command
3. The application will process your command and execute it

> **Note**: Voice recognition requires a secure context (HTTPS) in production. It works on localhost during development.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [React H5 Audio Player](https://github.com/lhz516/react-h5-audio-player)
- [Lucide React Icons](https://lucide.dev/)
- [Ollama](https://ollama.ai/)

---

Made with ❤️ by Chrissy8283 (Tomato6966)
