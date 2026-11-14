interface PostImageGridProps {
  images: string[];
  onOpen: (index: number) => void;
}

function layoutClass(count: number): string {
  if (count === 1) return 'grid-cols-1';
  if (count <= 4) return 'grid-cols-2';
  return 'grid-cols-3';
}

export function PostImageGrid({ images, onOpen }: PostImageGridProps) {
  if (images.length === 0) return null;

  const single = images.length === 1;

  return (
    <div
      className={`mt-3 grid gap-1.5 overflow-hidden rounded-2xl ${layoutClass(images.length)}`}
    >
      {images.slice(0, 9).map((url, index) => (
        <button
          key={`${url}-${index}`}
          type="button"
          aria-label={`查看第 ${index + 1} 张图片`}
          className={`group relative w-full overflow-hidden bg-default-100 ${single ? 'aspect-[16/9]' : 'aspect-square'}`}
          onClick={() => onOpen(index)}
        >
          <img
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            src={url}
          />
        </button>
      ))}
    </div>
  );
}