import type { MusicInfo } from "youtube-sr";

export type JSONVideoData = {
    id: string;
    url: string;
    shorts_url: string;
    title: string;
    description: string;
    duration: number;
    duration_formatted: string;
    uploadedAt: string;
    unlisted: boolean;
    nsfw: boolean;
    thumbnail: {
        width: number;
        height: number;
        url: string;
    };
    channel: {
        name: string;
        id: string;
        icon: string;
    };
    views: number;
    type: "video";
    tags: string[];
    ratings: {
        likes: number;
        dislikes: number;
    };
    shorts: boolean;
    live: boolean;
    private: boolean;
    music: MusicInfo[];
}


// Group related state in interfaces
export interface SearchState {
    query: string;
    results: JSONVideoData[];
    isLoading: boolean;
    mode: 'play' | 'enqueue';
    isSidebarOpen: boolean;
    neverChangedMode: boolean | null;
    showAutoSwitchTooltip: boolean;
}

export interface PlayerState {
    currentVideo: JSONVideoData | null;
    audioSrc: string;
    isLoading: boolean;
    autoplayEnabled: boolean;
}

export interface QueueState {
    items: JSONVideoData[];
    sources: { audioSrc?: Blob, id: string }[];
    draggedItem: number | null;
}
