export const canPronounce = (): boolean => {
  return typeof window !== "undefined" && "speechSynthesis" in window;
};

export const playPronunciation = (text: string): boolean => {
  if (!canPronounce()) {
    return false;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
};
