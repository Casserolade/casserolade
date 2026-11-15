/** A duration as a clock reads it: « 04:00 » under an hour, « 4:12:07 » from an hour on. Never negative. */
export function clockText(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const two = (value: number) => String(value).padStart(2, '0');
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  return hours > 0 ? `${hours}:${two(minutes)}:${two(whole % 60)}` : `${two(minutes)}:${two(whole % 60)}`;
}
