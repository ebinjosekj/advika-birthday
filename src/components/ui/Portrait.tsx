const base = import.meta.env.BASE_URL;

/** Advika's portrait in a gilded cameo frame (cropped from the reference invitation, no text). */
export function Portrait({ size = 150, className = '' }: { size?: number; className?: string }) {
  return (
    <figure className={`cameo ${className}`} style={{ width: size, height: size }}>
      <img
        src={`${base}images/advika-sm.jpg`}
        srcSet={`${base}images/advika-sm.jpg 360w, ${base}images/advika.jpg 720w`}
        sizes={`${size}px`}
        width={size}
        height={size}
        alt="Advika smiling in her fairy wings and flower crown"
        decoding="async"
        data-testid="advika-portrait"
      />
    </figure>
  );
}
