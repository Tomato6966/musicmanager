'use client';

import "./AudioPlayerComponent.css";
import "react-tooltip/dist/react-tooltip.css";

import {
	ArrowUp, Clock, Eye, EyeOff, GripVertical, List, Menu, Music, PauseIcon, Play, PlayIcon, Plus,
	Search, SearchCheck, ShuffleIcon, Timer, Trash2, UserIcon, X
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import AudioPlayer from "react-h5-audio-player";
import { Tooltip } from "react-tooltip";

import AudioVisualizer from "./AudioVisualizer";

import type { JSONVideoData } from "../types/MusicManager";

// Group related state in interfaces
interface SearchState {
    query: string;
    results: JSONVideoData[];
    isLoading: boolean;
    mode: 'play' | 'enqueue';
    isSidebarOpen: boolean;
    neverChangedMode: boolean | null;
    showAutoSwitchTooltip: boolean;
}

interface PlayerState {
    currentVideo: JSONVideoData | null;
    audioSrc: string;
    isLoading: boolean;
    autoplayEnabled: boolean;
    currentFilters: string[];
    filterParams: {
        bassBoost: number; // dB value for bass boost
    };
}

interface QueueState {
    items: JSONVideoData[];
    sources: { audioSrc?: Blob, id: string }[];
    draggedItem: number | null;
}

// Local storage keys
const STORAGE_KEYS = {
    QUEUE: 'music-player-queue',
    AUTOPLAY: 'music-player-autoplay'
};

const AudioPlayerComponent = () => {
    // UI state
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [showVisualizer, setShowVisualizer] = useState<boolean>(true);

    const [audioLoaded, setAudioLoaded] = useState<boolean>(false);

    // Grouped states
    const [searchState, setSearchState] = useState<SearchState>({
        query: "",
        results: [],
        isLoading: false,
        mode: 'play',
        isSidebarOpen: false,
        neverChangedMode: true,
        showAutoSwitchTooltip: false
    });

    const [playerState, setPlayerState] = useState<PlayerState>({
        currentVideo: null,
        audioSrc: "",
        isLoading: false,
        autoplayEnabled: localStorage.getItem(STORAGE_KEYS.AUTOPLAY) === 'true',
        currentFilters: [],
        filterParams: {
            bassBoost: 10 // Default value in dB
        }
    });

    const [queueState, setQueueState] = useState<QueueState>({
        items: [],
        sources: [],
        draggedItem: null
    });

    // We need to reference the tooltip's anchor directly
    const toggleRef = useRef<HTMLDivElement>(null);

    // Inside the AudioPlayerComponent, add this ref
    const audioElementRef = useRef<AudioPlayer>(null);

    // Add this new state to track playback position
    const [currentPlaybackPosition, setCurrentPlaybackPosition] = useState<number>(0);

    // Load queue from localStorage on component mount
    useEffect(() => {
        try {
            const savedQueue = localStorage.getItem(STORAGE_KEYS.QUEUE);
            if (savedQueue) {
                const parsedQueue = JSON.parse(savedQueue);
                setQueueState(prev => ({
                    ...prev,
                    items: parsedQueue
                }));
            }
        } catch (error) {
            console.error("Failed to load queue from localStorage:", error);
        }
    }, []);

    // Save queue to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queueState.items));
        } catch (error) {
            console.error("Failed to save queue to localStorage:", error);
        }
    }, [queueState.items]);

    // Save autoplay preference to localStorage when it changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.AUTOPLAY, playerState.autoplayEnabled.toString());
    }, [playerState.autoplayEnabled]);

    // Function to fetch the audio source for a video
    const fetchAudioSource = async (videoUrl: string) => {
        try {
            const filters = playerState.currentFilters;
            const queryParams = new URLSearchParams();

            // Don't encode the videoUrl since URLSearchParams will handle that
            queryParams.append('videoUrl', videoUrl);

            if (filters.length > 0) {
                queryParams.append('filters', filters.join(','));

                // Add bass boost level parameter if bass filter is active
                if (filters.includes('bass')) {
                    queryParams.append('bassBoost', playerState.filterParams.bassBoost.toString());
                }
            }

            const audioResponse = await fetch(`/api/stream?${queryParams}`);
            return await audioResponse.blob();
        } catch (error) {
            console.error("Failed to fetch audio source", error);
            return undefined;
        }
    };

    useEffect(() => {
        const updateQueueSources = async () => {
            const { items, sources } = queueState;
            const toRemove = sources.filter(source => !items.some(q => q.id === source.id));
            const toAdd = items.filter(source => !sources.some(q => q.id === source.id));

            if (!toRemove.length && !toAdd.length) return;

            setQueueState(prev => ({
                ...prev,
                sources: prev.sources.filter(v => !toRemove.some(q => q.id === v.id))
                                    .concat(toAdd.map(v => ({ id: v.id })))
            }));

            for (const item of toAdd) {
                const audioSrc = await fetchAudioSource(item.url);
                setQueueState(prev => {
                    const filtered = prev.sources.filter(src => src.id !== item.id);
                    if (filtered.length === prev.sources.length) return prev;
                    return {
                        ...prev,
                        sources: [
                            ...filtered,
                            { id: item.id, audioSrc }
                        ]
                    };
                });
            }
        };

        updateQueueSources();
    }, [queueState.items, queueState.sources]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        // Auto-switch to 'enqueue' mode once a track is playing, unless user manually changed it
        const { currentVideo } = playerState;
        const { mode, neverChangedMode } = searchState;

        if (currentVideo && mode === 'play' && neverChangedMode) {
            setSearchState(prev => ({
                ...prev,
                mode: 'enqueue',
                neverChangedMode: false,
                showAutoSwitchTooltip: true
            }));

            // Add a timeout to hide the tooltip after 2.5 seconds
            setTimeout(() => {
                setSearchState(prev => ({
                    ...prev,
                    showAutoSwitchTooltip: false
                }));
            }, 2500);
        }
    }, [playerState.currentVideo, searchState.mode, searchState.neverChangedMode]);

    const handleSearch = async (playDirectly: boolean = true) => {
        setSearchState(prev => ({
            ...prev,
            isLoading: true
        }));

        try {
            const response = await fetch(`/api/search?query=${encodeURIComponent(searchState.query)}`);
            const results: JSONVideoData[] = await response.json();

            if (response.ok && results.length > 0) {
                setSearchState(prev => ({
                    ...prev,
                    results,
                    isLoading: false,
                    isSidebarOpen: true
                }));

                if (playDirectly) {
                    handleSelectVideo(results[0]);
                } else {
                    setQueueState(prev => ({
                        ...prev,
                        items: [...prev.items, results[0]]
                    }));
                }
            } else {
                console.error("Error fetching search results:", results);
                setSearchState(prev => ({ ...prev, isLoading: false }));
            }
        } catch (error) {
            console.error("Error searching videos:", error);
            setSearchState(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handleSelectVideo = async (selectedVideo: JSONVideoData, preservePosition = false) => {
        setPlayerState(prev => ({
            ...prev,
            currentVideo: selectedVideo,
            isLoading: true
        }));

        try {
            const blob = queueState.sources.find(q => q.id === selectedVideo.id)?.audioSrc ||
                         await fetchAudioSource(selectedVideo.url);

            if (!blob) throw new Error("no blob found");

            // Save current URL to revoke later
            const previousSrc = playerState.audioSrc;

            // Create and set new audio source URL
            const newAudioSrc = URL.createObjectURL(blob);

            setPlayerState(prev => ({
                ...prev,
                audioSrc: newAudioSrc,
                isLoading: false
            }));

            // Revoke previous object URL to prevent memory leaks
            if (previousSrc) {
                URL.revokeObjectURL(previousSrc);
            }

            // If we're preserving position, set it after a short delay to ensure the new audio loads
            if (preservePosition && audioElementRef.current?.audio?.current) {
                setTimeout(() => {
                    if (audioElementRef.current?.audio?.current) {
                        audioElementRef.current.audio.current.currentTime = currentPlaybackPosition;
                        audioElementRef.current.audio.current.play();
                    }
                }, 100);
            }
        } catch (error) {
            console.error("Error fetching audio stream:", error);
            setPlayerState(prev => ({ ...prev, isLoading: false }));
        } finally {
            if (isMobile) {
                setSearchState(prev => ({
                    ...prev,
                    isSidebarOpen: false
                }));
            }
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch(searchState.mode === 'play');
        }
    };

    const handleEndedAudio = async () => {
        setAudioLoaded(false);
        if (!playerState.currentVideo?.id) return;

        if (queueState.items.length) {
            const song = queueState.items[0];
            setQueueState(prev => ({
                ...prev,
                items: prev.items.slice(1)
            }));
            return handleSelectVideo(song);
        }

        if (!playerState.autoplayEnabled) return;

        setPlayerState(prev => ({ ...prev, isLoading: true }));

        try {
            const response = await fetch(`/api/autocomplete?videoId=${playerState.currentVideo?.id}`);
            const suggestions: JSONVideoData[] = await response.json();

            if (response.ok && suggestions.length > 0) {
                await handleSelectVideo(suggestions[0]);
                setQueueState(prev => ({
                    ...prev,
                    items: suggestions
                }));
            } else {
                console.error("Error fetching search results:", suggestions);
                setPlayerState(prev => ({ ...prev, isLoading: false }));
            }
        } catch (error) {
            console.error("Error fetching audio stream:", error);
            setPlayerState(prev => ({ ...prev, isLoading: false }));
        }
    }

    const toggleSearchMode = () => {
        setSearchState(prev => ({
            ...prev,
            mode: prev.mode === 'play' ? 'enqueue' : 'play',
            showAutoSwitchTooltip: false
        }));
    };

    const handleRemoveFromQueue = (index: number) => {
        setQueueState(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setQueueState(prev => ({ ...prev, draggedItem: index }));

        e.dataTransfer.effectAllowed = 'move';
        const dragImg = document.createElement('div');
        dragImg.style.width = '0px';
        dragImg.style.height = '0px';
        document.body.appendChild(dragImg);
        e.dataTransfer.setDragImage(dragImg, 0, 0);
        setTimeout(() => document.body.removeChild(dragImg), 0);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        const { draggedItem, items } = queueState;

        if (draggedItem === null) return;

        if (draggedItem !== index) {
            const newQueue = [...items];
            const movedItem = newQueue[draggedItem];
            newQueue.splice(draggedItem, 1);
            newQueue.splice(index, 0, movedItem);

            setQueueState(prev => ({
                ...prev,
                items: newQueue,
                draggedItem: index
            }));
        }
    };

    const handleDragEnd = () => {
        setQueueState(prev => ({ ...prev, draggedItem: null }));
    };

    // Update the applyFiltersLive function to handle timing better
    const applyFiltersLive = async () => {
        if (!playerState.currentVideo) return;

        // Get current playing status
        const audioEl = audioElementRef.current?.audio?.current;
        const wasPlaying = audioEl ? !audioEl.paused : false;

        // Mark the request start time
        const requestStartTime = Date.now();
        let positionAtRequestStart = 0;

        if (audioEl) {
            positionAtRequestStart = audioEl.currentTime;
        }

        // Reload the current video with new filters
        setPlayerState(prev => ({
            ...prev,
            isLoading: true
        }));

        try {
            const blob = await fetchAudioSource(playerState.currentVideo.url);

            if (!blob) throw new Error("no blob found");

            // Calculate time elapsed during request
            const requestDuration = (Date.now() - requestStartTime) / 1000; // in seconds

            // Calculate the adjusted position (original position + request time)
            let adjustedPosition = positionAtRequestStart;
            if (wasPlaying) {
                adjustedPosition += requestDuration;
            }

            // Save current URL to revoke later
            const previousSrc = playerState.audioSrc;

            // Create and set new audio source URL
            const newAudioSrc = URL.createObjectURL(blob);

            setPlayerState(prev => ({
                ...prev,
                audioSrc: newAudioSrc,
                isLoading: false
            }));

            // Revoke previous object URL to prevent memory leaks
            if (previousSrc) {
                URL.revokeObjectURL(previousSrc);
            }

            // Apply the adjusted position after a short delay to ensure the new audio loads
            setTimeout(() => {
                if (audioElementRef.current?.audio?.current) {
                    // Set the calculated position
                    setCurrentPlaybackPosition(adjustedPosition);
                    audioElementRef.current.audio.current.currentTime = adjustedPosition;

                    // Restore playing state
                    if (wasPlaying) {
                        audioElementRef.current.audio.current.play();
                    }
                }
            }, 100);
        } catch (error) {
            console.error("Error applying filters:", error);
            setPlayerState(prev => ({ ...prev, isLoading: false }));
        }
    };

    // Add an event listener to track current playback position
    useEffect(() => {
        const audioEl = audioElementRef.current?.audio?.current;
        if (!audioEl) return;

        const updatePosition = () => {
            setCurrentPlaybackPosition(audioEl.currentTime);
        };

        audioEl.addEventListener('timeupdate', updatePosition);
        return () => {
            audioEl.removeEventListener('timeupdate', updatePosition);
        };
    }, [playerState.audioSrc]); // Re-attach when audio source changes

    // Destructure state for easier access in JSX
    const { query, results, isLoading: isLoadingVideo, mode: searchMode, isSidebarOpen, showAutoSwitchTooltip } = searchState;
    const { currentVideo: videoData, audioSrc, isLoading: isLoadingAudio, autoplayEnabled, currentFilters } = playerState;
    const { items: queue, draggedItem } = queueState;

    // Add this useEffect to update the document title when a song changes
    useEffect(() => {
        // Store original document title when component mounts
        const originalTitle = document.title;

        // Update title when song changes
        if (playerState.currentVideo?.title) {
            document.title = `${playerState.currentVideo.title} - Music-Manager`;
        } else {
            document.title = originalTitle;
        }

        // Restore original title when component unmounts
        return () => {
            document.title = originalTitle;
        };
    }, [playerState.currentVideo]);

    return (
        <>
            <h1 className="text-blue-500/40 hover:text-blue-300/60 text-3xl font-bold top-4 left-4 absolute">Music-Manager Player</h1>
            <div className="flex w-full items-center justify-center">
                <div className={`w-[50dvw] rounded-2xl bg-gradient-to-br from-[#0c111c] to-[#131934] text-white relative max-h-[90dvh] transition-all duration-300 ${isSidebarOpen && !isMobile ? "mr-96" : ""}`}>
                    {/* Main Content */}
                    <div className={`transition-all duration-300 px-4`}>
                        <div className={`container mx-auto py-8 transition-all duration-300 max-w-4xl`}>
                            {/* Search Section */}
                            <div className="relative mb-8">
                                <div className="flex gap-4 items-center bg-gray-800/50 backdrop-blur-sm rounded-lg p-2">
                                    <Search className="text-gray-400 w-6 h-6 ml-2" />
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setSearchState(prev => ({ ...prev, query: e.target.value }))}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Search for a song..."
                                        className="w-full bg-transparent border-none focus:outline-none text-lg placeholder-gray-500"
                                    />
                                    <div className="flex items-center gap-2">
                                        <Tooltip
                                            id="showing_instant_move"
                                            delayShow={0}
                                            delayHide={300}
                                            isOpen={showAutoSwitchTooltip}
                                            content={"Automatically switched to enqueue mode"}
                                            place="top"
                                            className="z-50 max-w-xs"
                                            anchorSelect="#toggleModeButton"
                                        />
                                        <div
                                            ref={toggleRef}
                                            id="toggleModeButton"
                                            className="flex items-center cursor-pointer rounded-lg overflow-hidden transition-all duration-300 text-xs"
                                            onClick={toggleSearchMode}
                                        >
                                            <div className={`px-4 py-2 flex items-center gap-2 ${searchMode === 'play' ? 'bg-blue-600' : 'bg-blue-600/40 text-gray-800'} transition-all duration-300`}>
                                                <SearchCheck className="w-5 h-5" />
                                                <span>Play</span>
                                            </div>
                                            <div className={`px-4 py-2 flex items-center gap-2 ${searchMode === 'enqueue' ? 'bg-purple-600' : 'bg-purple-600/40  text-gray-800'} transition-all duration-300`}>
                                                <List className="w-5 h-5" />
                                                <span>Enqueue</span>
                                            </div>
                                        </div>
                                        <Tooltip id="search_button" delayShow={0} delayHide={0} content={"Hit 'Enter' to trigger search"} />
                                        <button
                                            data-tooltip-id="search_button"
                                            onClick={() => handleSearch(searchMode === 'play')}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-700/80 hover:bg-gray-700 backdrop-blur-sm rounded-lg transition-all duration-300 hover:scale-105"
                                        >
                                            <Search className="w-5 h-5" />
                                            Search
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Player Section */}
                            {videoData && (
                                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-2xl relative">
                                    <div className="flex flex-col md:flex-row gap-8 items-center mb-6">
                                        <div className="w-full md:w-1/3">
                                            <div className="relative group">
                                                <img
                                                    src={videoData.thumbnail?.url}
                                                    alt={videoData.title}
                                                    className="w-full rounded-lg shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02]"
                                                />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300 rounded-lg" />
                                            </div>
                                        </div>
                                        <div className="w-full md:w-2/3 space-y-4">
                                            <h3 className="text-2xl font-bold leading-tight">{videoData.title}</h3>
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Music className="w-4 h-4" />
                                                <span>{videoData.channel?.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Timer className="w-4 h-4" />
                                                <span className="text-sm">Duration: {videoData.duration_formatted}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {isLoadingAudio && <div className="flex justify-center items-center h-24">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                    </div>}
                                    {audioSrc && (
                                        <>
                                            <AudioPlayer
                                                src={audioSrc}
                                                autoPlay
                                                showJumpControls
                                                showSkipControls
                                                onClickNext={() => {
                                                    return handleEndedAudio();
                                                }}
                                                className="rounded-lg overflow-hidden shadow-lg relative z-20"
                                                onEnded={() => handleEndedAudio()}
                                                onLoadStart={() => setAudioLoaded(true)}
                                                ref={audioElementRef}
                                            />
                                        </>
                                    )}
                                </div>
                            )}

                            {isLoadingVideo && !isSidebarOpen && (
                                <div className="flex justify-center items-center h-64">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Hamburger Menu Button */}
                    {!isSidebarOpen && (
                        <button
                            onClick={() => setSearchState(prev => ({ ...prev, isSidebarOpen: true }))}
                            className="fixed right-0 top-1/2 -translate-y-1/2 bg-gray-800/95 backdrop-blur-sm p-2 rounded-l-lg shadow-lg hover:bg-gray-700/95 transition-all duration-300 group"
                        >
                            <Menu className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" />
                        </button>
                    )}
                    <div className="flex flex-wrap gap-4 p-4 w-full justify-center items-center">
                        <div className="w-full flex items-center justify-center gap-x-4 gap-y-2 flex-wrap">
                            <h1 className="text-3xl text-blue-500/40 hover:text-blue-300/60 transition-all duration-300">Queue</h1>
                            <Tooltip id="clear_queue" delayShow={0} delayHide={0} content={"Clear the queue"} />
                            <button
                                data-tooltip-id="clear_queue"
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700/60 rounded-full transition-all"
                                onClick={() => setQueueState(prev => ({ ...prev, items: [] }))}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <Tooltip id="shuffle_queue" delayShow={0} delayHide={0} content={"Shuffle the queue"} />
                            <button
                                data-tooltip-id="shuffle_queue"
                                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-700/60 rounded-full transition-all"
                                onClick={() => setQueueState(prev => ({ ...prev, items: [...prev.items].sort(() => Math.random() - 0.5) }))}>
                                <ShuffleIcon className="w-4 h-4" />
                            </button>
                            <Tooltip id="autoplay" delayShow={0} delayHide={0} content={"If enabled, the player will automatically search songs based on the previously played song"} />
                            <button
                                data-tooltip-id="autoplay"
                                className={`p-2 ${autoplayEnabled ? 'text-green-500' : 'text-gray-400'} hover:text-green-500 hover:bg-gray-700/60 rounded-full transition-all flex items-center gap-2`}
                                onClick={() => setPlayerState(prev => ({ ...prev, autoplayEnabled: !prev.autoplayEnabled }))}
                            >
                                {autoplayEnabled ? <PlayIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />} Autoplay
                            </button>
                            <Tooltip id="toggle_visualizer" delayShow={0} delayHide={0} content={showVisualizer ? "Hide audio visualizer" : "Show audio visualizer"} />
                            <button
                                data-tooltip-id="toggle_visualizer"
                                className={`p-2 ${showVisualizer ? 'text-blue-400' : 'text-gray-400'} hover:text-blue-500 hover:bg-gray-700/60 rounded-full transition-all flex items-center gap-2`}
                                onClick={() => setShowVisualizer(prev => !prev)}
                            >
                                {showVisualizer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                {showVisualizer ? 'Hide' : 'Show'} Visualizer
                            </button>
                            <div className="relative group">
                                <Tooltip id="audio_filters" delayShow={0} delayHide={0} content="Apply audio filters" />
                                <button
                                    data-tooltip-id="audio_filters"
                                    className={`p-2 ${currentFilters.length > 0 ? 'text-purple-400' : 'text-gray-400'} hover:text-purple-500 hover:bg-gray-700/60 rounded-full transition-all flex items-center gap-2`}
                                    onClick={() => {
                                        const dialog = document.getElementById('filter-dialog');
                                        if (dialog && typeof (dialog as any).showModal === 'function') {
                                            (dialog as any).showModal();
                                        }
                                    }}
                                >
                                    <Music className="w-4 h-4" />
                                    Filters ({currentFilters.length})
                                </button>
                            </div>
                        </div>
                        {queue?.length > 0 ? (
                            <div className="flex flex-wrap gap-4 p-4 w-full justify-center items-center overflow-y-auto max-h-[30dvh]">
                                {queue.map((song, index) => (
                                    <div
                                        key={`${song.id}_${index}`}
                                        className={`flex gap-4 w-[70%] max-w-[70%] h-24 rounded-lg bg-gray-800/95 p-4 relative transition-colors duration-200 ${draggedItem === index ? 'bg-gray-700/95 shadow-xl' : ''}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <div className="flex items-center px-1">
                                            <div
                                                aria-label="Drag to reorder"
                                                className="cursor-move p-2 rounded hover:bg-gray-700 transition-colors"
                                                title="Drag to reorder"
                                            >
                                                <GripVertical className="w-5 h-5 text-gray-400" />
                                            </div>
                                        </div>
                                        <img src={song.thumbnail?.url} alt="thumb" className="rounded-md w-28 object-cover" />
                                        <div className="flex flex-col flex-1 justify-between pr-4 overflow-hidden">
                                            <div
                                                className="text-sm font-semibold overflow-hidden text-ellipsis whitespace-nowrap cursor-default"
                                                aria-label={"Song Title"}
                                                title={song.title}
                                                about={song.title}
                                            >
                                                {song.title}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex flex-wrap items-start gap-2 overflow-hidden">
                                                    <span className="text-gray-400 text-xs flex w-full items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap" aria-label={"Song-Author Name"}>
                                                        <UserIcon width={12} height={12} /> {song.channel?.name}
                                                    </span>
                                                    <span className="text-gray-400 text-xs flex items-center gap-2" aria-label={"Song-Duration"}>
                                                        <Clock className="w-4 h-4" /> {song.duration_formatted}
                                                    </span>
                                                </div>
                                                <div className="self-end">
                                                    <button
                                                        aria-label="Remove from queue"
                                                        onClick={() => handleRemoveFromQueue(index)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700/60 rounded-full transition-all"
                                                        title="Remove from queue"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-4 p-4 w-full justify-center items-center">
                                <p className="text-md text-red-400/30 italic duration-300">Queue is empty</p>
                            </div>
                        )}
                    </div>

                    {/* Search Results Sidebar */}
                    <div
                        className={`fixed top-0 right-0 h-full bg-gray-800/95 backdrop-blur-sm transform transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
                            } ${isMobile ? 'w-full' : 'w-96'} overflow-y-auto border-l border-gray-700/50 z-50`}
                    >
                        <div className="p-4 sticky top-0 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700/50 z-10">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold">Search Results</h2>
                                <button
                                    onClick={() => setSearchState(prev => ({ ...prev, isSidebarOpen: false }))}
                                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            {isLoadingVideo ? (
                                <div className="flex justify-center items-center h-64">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                </div>
                            ) : (
                                results.map((video) => (
                                    <div
                                        key={video.id}
                                        className="flex gap-3 w-full text-left bg-gray-700/50 hover:bg-gray-600/50 rounded-lg p-4 transition-all duration-300 hover:scale-[1.02] group"
                                    >
                                        <div className="grid grid-cols-1 grid-rows-2">
                                            <button
                                                data-tooltip-id="play" data-tooltip-content="Play now"
                                                className="text-gray-500 hover:text-blue-500"
                                                onClick={() => handleSelectVideo(video)}
                                            >
                                                <Play />
                                            </button>
                                            <Tooltip id="play" delayShow={0} delayHide={0} />

                                            <button
                                                data-tooltip-id="enqueue_end" data-tooltip-content="Add to end of Queue"
                                                className="text-gray-500 hover:text-purple-500"
                                                onClick={() => setQueueState(prev => ({ ...prev, items: [...prev.items, video] }))}
                                            >
                                                <Plus />
                                            </button>
                                            <Tooltip id="enqueue_end" delayShow={0} delayHide={0} />

                                            <button
                                                data-tooltip-id="enqueue_top" data-tooltip-content="Add to top of Queue"
                                                className="text-gray-500 hover:text-green-500"
                                                onClick={() => setQueueState(prev => ({ ...prev, items: [video, ...prev.items] }))}
                                            >
                                                <ArrowUp />
                                            </button>
                                            <Tooltip id="enqueue_top" delayShow={0} delayHide={0} />
                                        </div>
                                        <div className="w-full">
                                            <div className="flex gap-4">
                                                <div className="relative">
                                                    <img
                                                        src={video.thumbnail?.url}
                                                        alt={video.title}
                                                        className="w-24 h-24 object-cover rounded-md"
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all duration-300 rounded-md" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold line-clamp-2">{video.title}</h3>
                                                    <p className="text-sm text-gray-400 mt-1">{video.channel?.name}</p>
                                                    <p className="text-sm text-gray-400 mt-1">{video.duration_formatted}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Always render AudioVisualizer, control visibility via prop */}
            <AudioVisualizer
                audioElementRef={audioElementRef?.current?.audio?.current}
                audioLoaded={audioLoaded}
                isVisible={showVisualizer}
            />
            <dialog id="filter-dialog" className="bg-gray-800 text-white rounded-lg p-6 shadow-2xl backdrop:bg-black/70">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Audio Filters</h3>
                    <button
                        onClick={() => {
                            const dialog = document.getElementById('filter-dialog');
                            if (dialog) {
                                (dialog as any).close();
                            }
                        }}
                        className="p-1 hover:bg-gray-700 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                        { id: 'bass', label: 'Bass Boost', icon: '🔊' },
                        { id: 'subboost', label: 'Sub Boost', icon: '📢' },
                        { id: 'subcut', label: 'Sub Cut (Reduce)', icon: '📢' },
                        { id: 'echo', label: 'Echo', icon: '🔄' },
                        { id: 'normalize', label: 'Normalize', icon: '📊' },
                        { id: 'reverb', label: 'Reverb', icon: '🌊' },
                        { id: 'nightcore', label: 'Nightcore', icon: '⚡' }
                    ].map(filter => (
                        <div
                            key={filter.id}
                            className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors
                                ${currentFilters.includes(filter.id)
                                    ? 'bg-purple-600/60 hover:bg-purple-600/80'
                                    : 'bg-gray-700/60 hover:bg-gray-700/80'}`}
                            onClick={() => {
                                setPlayerState(prev => {
                                    const newFilters = prev.currentFilters.includes(filter.id)
                                        ? prev.currentFilters.filter(f => f !== filter.id)
                                        : [...prev.currentFilters, filter.id];

                                    return {
                                        ...prev,
                                        currentFilters: newFilters
                                    };
                                });
                            }}
                        >
                            <span className="text-lg">{filter.icon}</span>
                            <span>{filter.label}</span>
                            {currentFilters.includes(filter.id) && (
                                <svg className="w-4 h-4 ml-auto text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M5 13l4 4L19 7"></path>
                                </svg>
                            )}
                        </div>
                    ))}
                </div>

                {/* Bass Boost Level Slider - Only show when bass is selected */}
                {currentFilters.includes('bass') && (
                    <div className="mb-4 p-3 bg-gray-700/60 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="bassBoostSlider" className="text-sm font-medium">
                                Bass Boost Level: {playerState.filterParams.bassBoost} dB
                            </label>
                        </div>
                        <input
                            id="bassBoostSlider"
                            type="range"
                            min="-20"
                            max="20"
                            step="1"
                            value={playerState.filterParams.bassBoost}
                            onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                setPlayerState(prev => ({
                                    ...prev,
                                    filterParams: {
                                        ...prev.filterParams,
                                        bassBoost: value
                                    }
                                }));
                            }}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>1 dB</span>
                            <span>10 dB</span>
                            <span>20 dB</span>
                        </div>
                    </div>
                )}

                <div className="flex justify-between mt-4">
                    <button
                        className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                        onClick={() => {
                            setPlayerState(prev => ({
                                ...prev,
                                currentFilters: []
                            }));
                        }}
                    >
                        Clear All
                    </button>

                    <button
                        className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg transition-colors"
                        onClick={() => {
                            const dialog = document.getElementById('filter-dialog');
                            if (dialog) {
                                (dialog as any).close();
                            }

                            // Apply filters to current track if one is playing
                            if (playerState.currentVideo) {
                                applyFiltersLive();
                            }
                        }}
                    >
                        Apply Filters
                    </button>
                </div>
            </dialog>
        </>
    );
};

export default AudioPlayerComponent;
