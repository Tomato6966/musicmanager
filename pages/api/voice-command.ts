import type { NextApiRequest, NextApiResponse } from 'next';
/**
 * This is a voice command interpreter for the music player.
 * It uses Ollama to parse the command and return a JSON object.
 * You can use the new Browser based SpeechRecognition API to get the command from the user.
 * https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
 * Or you can also streamline the recording audio to https://wit.ai
 * I have made a discord bot with that functionality, if you are interested in that https://github.com/Tomato6966/voice-controlled-discord-bot
 */

// Define the structure for the voice commands
interface VoiceCommand {
  type: string;
  payload?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VoiceCommand | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Invalid command' });
    }

    // Call Ollama to parse the command
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3',
        prompt: buildPrompt(command),
        stream: false,
        options: {
          temperature: 0.1,
        }
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error('Failed to connect to Ollama');
    }

    const data = await ollamaResponse.json();
    const parsedCommand = parseOllamaResponse(data.response);

    return res.status(200).json(parsedCommand);

  } catch (error) {
    console.error('Error processing voice command:', error);
    return res.status(500).json({ error: 'Failed to process command' });
  }
}

function buildPrompt(command: string): string {
  return `You are a voice command interpreter for a music player. Parse the following command and output only a JSON object representing the command with no additional text.

Available commands:
- search: Search for a song and add it to the end of the queue
- play: Search for a song and play it immediately
- addToQueueTop: Search for a song and add it to the top of the queue
- addToQueueEnd: Search for a song and add it to the end of the queue
- pause: Pause the current playback
- resume: Resume playback
- skip: Skip to the next song
- volumeUp: Increase the volume
- volumeDown: Decrease the volume
- volumeMax: Set volume to maximum
- mute: Toggle mute
- clearQueue: Clear the queue
- shuffleQueue: Shuffle the queue

Command: "${command}"

Output JSON with "type" and optional "payload" fields. For example:
{"type":"play","payload":"bohemian rhapsody"}

JSON:`;
}

function parseOllamaResponse(response: string): VoiceCommand {
  try {
    // Extract JSON from the response - the model might wrap it
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonString = jsonMatch[0];
      return JSON.parse(jsonString);
    }

    // If no valid JSON found, try to determine the command from text
    if (response.includes('play')) {
      const song = response.replace(/play/i, '').trim();
      return { type: 'play', payload: song };
    }

    if (response.includes('search')) {
      const song = response.replace(/search/i, '').trim();
      return { type: 'search', payload: song };
    }

    if (response.includes('pause')) {
      return { type: 'pause' };
    }

    // Default fallback
    return { type: 'unknown' };

  } catch (error) {
    console.error('Error parsing Ollama response:', error);
    return { type: 'unknown' };
  }
}
