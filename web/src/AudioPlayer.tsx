import { Box, Flex, IconButton, Slider, Text } from "@radix-ui/themes";
import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const formatTime = (time: number) => {
  if (isNaN(time)) return "00:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AudioPlayer = (props: any) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isEnded, setIsEnded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!isEnded) {
        setCurrentTime(audio.currentTime);
      }
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      setIsPlaying(false);
      setIsEnded(true);
      if (audio.duration) setCurrentTime(audio.duration);
    };
    const onPlay = () => {
      setIsPlaying(true);
      setIsEnded(false);
    };
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [isEnded]);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        void audioRef.current.play();
      }
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number | number[]) => {
    if (audioRef.current) {
      setIsEnded(false);
      const time = Array.isArray(value) ? value[0] : value;
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars
  const { controls, className, style, ...restProps } = props;

  return (
    <Flex
      align="center"
      gap="3"
      className={`my-2.5 w-full max-w-md rounded-xl border border-[var(--dd-color-border)] bg-[var(--dd-color-surface)] px-3 py-2.5 shadow-[var(--dd-shadow-xs)] ${className || ""}`}
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      style={style}
    >
      <audio ref={audioRef} {...restProps} className="hidden" />

      <IconButton
        size="2"
        variant="soft"
        color="jade"
        radius="full"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause size={15} /> : <Play size={15} />}
      </IconButton>

      <Box className="flex w-full flex-1 flex-col justify-center gap-1">
        <Slider
          size="1"
          step={0.01}
          max={duration || 100}
          min={0}
          value={[isEnded ? duration : currentTime]}
          onValueChange={handleSeek}
          aria-label="Audio Progress"
          color="jade"
        />
      </Box>

      <Text
        size="1"
        weight="medium"
        color="gray"
        className="min-w-[74px] text-right font-mono tabular-nums"
      >
        {formatTime(currentTime)} / {formatTime(duration)}
      </Text>
    </Flex>
  );
};
