import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { GalleryWall, UserWallAllocation } from "../galleryLayoutEngine";

export type GalleryImage = {
  id: string;
  name: string;
  size: number;
  url: string;
};

const WALLS: Array<{ key: GalleryWall; label: string }> = [
  { key: "front", label: "Front Wall" },
  { key: "left", label: "Left Wall" },
  { key: "right", label: "Right Wall" }
];
const MAX_IMAGES = 15;

function formatSize(bytes: number) {
  const megabytes = bytes / 1024 / 1024;
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

export default function HomePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const keepPreviewUrlsRef = useRef(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [status, setStatus] = useState("Upload 1-15 images to begin.");
  const [generated, setGenerated] = useState(false);
  const [isAllocatorOpen, setIsAllocatorOpen] = useState(false);
  const [allocation, setAllocation] = useState<UserWallAllocation>({
    front: [],
    left: [],
    right: []
  });

  const imageCount = useMemo(() => `${images.length}`, [images.length]);
  const helperText = generated
    ? "The current image selection has been generated."
    : "Choose 1-15 image files to preview your gallery.";

  useEffect(() => {
    return () => {
      if (!keepPreviewUrlsRef.current) {
        previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      }
    };
  }, []);

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const selectedImages = selectedFiles.filter((file) => file.type.startsWith("image/"));

    if (selectedFiles.length === 0) {
      return;
    }

    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
    keepPreviewUrlsRef.current = false;
    setGenerated(false);

    if (selectedFiles.length > 0 && selectedImages.length === 0) {
      setImages([]);
      setStatus("No image files were found in that selection.");
      event.target.value = "";
      return;
    }

    const acceptedImages = selectedImages.slice(0, MAX_IMAGES);
    const previews = acceptedImages.map((file) => ({
      id: `${file.name}-${file.lastModified}-${file.size}`,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file)
    }));

    previewUrlsRef.current = previews.map((image) => image.url);
    setImages(previews);
    setAllocation({
      front: previews.map((image) => image.id),
      left: [],
      right: []
    });
    setStatus(
      previews.length > 0
        ? selectedImages.length > MAX_IMAGES
          ? "Only the first 15 images were added. Generate the gallery when you are ready."
          : "Images ready. Generate the gallery when you are ready."
        : "No images selected. You can still open an empty gallery."
    );
    event.target.value = "";
  }

  function handleGenerate() {
    if (images.length === 0) {
      setStatus("Upload at least 1 image before generating the gallery.");
      return;
    }

    if (images.length > 0) {
      setIsAllocatorOpen(true);
      setStatus("Assign artworks to the walls before generating.");
      return;
    }
  }

  function getAllocationTotal(nextAllocation = allocation) {
    return WALLS.reduce(
      (sum, wall) => sum + nextAllocation[wall.key].length,
      0
    );
  }

  function moveImageToWall(imageId: string, nextWall: GalleryWall) {
    setAllocation((current) => {
      const nextAllocation: UserWallAllocation = {
        front: current.front.filter((id) => id !== imageId),
        left: current.left.filter((id) => id !== imageId),
        right: current.right.filter((id) => id !== imageId)
      };

      nextAllocation[nextWall] = [...nextAllocation[nextWall], imageId];
      return nextAllocation;
    });
  }

  function reorderWall(wall: GalleryWall, fromIndex: number, toIndex: number) {
    setAllocation((current) => {
      if (fromIndex === toIndex) {
        return current;
      }

      const nextWallItems = [...current[wall]];
      const [movedItem] = nextWallItems.splice(fromIndex, 1);

      if (!movedItem) {
        return current;
      }

      nextWallItems.splice(toIndex, 0, movedItem);

      return {
        ...current,
        [wall]: nextWallItems
      };
    });
  }

  function handleConfirmAllocation() {
    if (getAllocationTotal() !== images.length) {
      setStatus("Wall allocation must match the uploaded image count.");
      return;
    }

    setGenerated(true);
    setIsAllocatorOpen(false);
    setStatus("Gallery generated.");
    keepPreviewUrlsRef.current = true;
    window.history.pushState(
      {
        galleryImages: images,
        galleryAllocation: allocation
      },
      "",
      "/gallery"
    );
    window.dispatchEvent(new Event("gallery:navigate"));
  }

  function getImageById(imageId: string) {
    return images.find((image) => image.id === imageId);
  }

  const featureHighlights = [
    "Upload artworks",
    "Arrange gallery walls",
    "Explore in 3D",
    "Edit artwork descriptions"
  ];

  return (
    <main className="app-shell home-page">
      <section className="hero home-hero">
        <div className="hero__copy">
          <p className="eyebrow">Personal collection builder</p>
          <h1>Personal Art Gallery</h1>
          <p className="home-hero__subtitle">
            Create your own immersive 3D exhibition space.
          </p>
          <p className="hero__text">
            Upload your artworks, arrange them across gallery walls, and
            explore them in a personal virtual room.
          </p>
          <div className="feature-list" aria-label="Gallery features">
            {featureHighlights.map((feature) => (
              <span className="feature-pill" key={feature}>
                {feature}
              </span>
            ))}
          </div>
          <div className="actions">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
            />
            <button
              type="button"
              className="button button--secondary"
              onClick={() => inputRef.current?.click()}
            >
              Upload Images
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={handleGenerate}
            >
              Generate Gallery
            </button>
          </div>
        </div>

        <aside className="status-card upload-card">
          <div>
            <span className="counter">{imageCount} images</span>
            <h2>{status}</h2>
            <p>{helperText}</p>
          </div>
          <button
            type="button"
            className="upload-card__dropzone"
            onClick={() => inputRef.current?.click()}
          >
            <span>Choose artwork files</span>
            <small>JPG, PNG, WebP and other image formats · up to 15 images</small>
          </button>
        </aside>
      </section>

      <section className="preview-panel" aria-label="Image preview grid">
        <div className="preview-panel__header">
          <div>
            <p className="eyebrow">Artwork preview</p>
            <h2>Your selected collection</h2>
          </div>
          <span className="counter">{imageCount} images</span>
        </div>
        {images.length > 0 ? (
          <div className="image-grid">
            {images.map((image, index) => (
              <figure className="image-card" key={image.id}>
                <img src={image.url} alt={image.name} />
                <figcaption>
                  <span>
                    <strong>{image.name}</strong>
                    <small>{formatSize(image.size)}</small>
                  </span>
                  <em>{String(index + 1).padStart(2, "0")}</em>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>No images uploaded</h2>
            <p>Upload images to preview them here.</p>
          </div>
        )}
      </section>

      {isAllocatorOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Allocate artworks to gallery walls"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "rgba(12, 14, 13, 0.72)",
            backdropFilter: "blur(8px)"
          }}
        >
          <section
            style={{
              width: "min(1180px, 96vw)",
              maxHeight: "90vh",
              overflow: "auto",
              borderRadius: "8px",
              background: "rgba(248, 249, 246, 0.96)",
              boxShadow: "0 28px 90px rgba(0, 0, 0, 0.32)",
              padding: "22px"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "flex-start",
                marginBottom: "18px"
              }}
            >
              <div>
                <p className="eyebrow" style={{ marginBottom: "6px" }}>
                  User Space Allocator
                </p>
                <h2 style={{ margin: 0, fontSize: "28px" }}>
                  Assign artworks to walls
                </h2>
                <p style={{ margin: "8px 0 0", color: "rgba(30, 37, 32, 0.68)" }}>
                  Total assigned: {getAllocationTotal()} / {images.length}
                </p>
                <p style={{ margin: "4px 0 0", color: "rgba(30, 37, 32, 0.58)" }}>
                  Context / Optional remaining: {images.length - getAllocationTotal()}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => setIsAllocatorOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleConfirmAllocation}
                  disabled={getAllocationTotal() !== images.length}
                >
                  Enter Gallery
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "14px"
              }}
            >
              {WALLS.map((wall) => (
                <section
                  key={wall.key}
                  style={{
                    minHeight: "280px",
                    border: "1px solid rgba(30, 37, 32, 0.12)",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.72)",
                    padding: "12px"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px"
                    }}
                  >
                    <strong>{wall.label}</strong>
                    <span className="counter">{allocation[wall.key].length}</span>
                  </div>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {allocation[wall.key].map((imageId, index) => {
                      const image = getImageById(imageId);

                      if (!image) {
                        return null;
                      }

                      return (
                        <article
                          key={image.id}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData(
                              "application/x-wall",
                              wall.key
                            );
                            event.dataTransfer.setData(
                              "application/x-index",
                              String(index)
                            );
                          }}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            const fromWall = event.dataTransfer.getData(
                              "application/x-wall"
                            ) as GalleryWall;
                            const fromIndex = Number(
                              event.dataTransfer.getData("application/x-index")
                            );

                            if (fromWall === wall.key && Number.isFinite(fromIndex)) {
                              reorderWall(wall.key, fromIndex, index);
                            }
                          }}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "58px 1fr",
                            gap: "10px",
                            alignItems: "center",
                            padding: "8px",
                            border: "1px solid rgba(30, 37, 32, 0.1)",
                            borderRadius: "8px",
                            background: "rgba(250, 250, 248, 0.94)",
                            cursor: "grab"
                          }}
                        >
                          <img
                            src={image.url}
                            alt={image.name}
                            style={{
                              width: "58px",
                              height: "58px",
                              objectFit: "cover",
                              borderRadius: "6px"
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <strong
                              style={{
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontSize: "13px"
                              }}
                            >
                              {image.name}
                            </strong>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "6px",
                                marginTop: "8px"
                              }}
                            >
                              {WALLS.filter((targetWall) => targetWall.key !== wall.key).map(
                                (targetWall) => (
                                  <button
                                    key={targetWall.key}
                                    type="button"
                                    onClick={() =>
                                      moveImageToWall(image.id, targetWall.key)
                                    }
                                    style={{
                                      minHeight: "24px",
                                      border: "1px solid rgba(30, 37, 32, 0.14)",
                                      borderRadius: "999px",
                                      background: "rgba(255, 255, 255, 0.72)",
                                      cursor: "pointer",
                                      fontSize: "11px",
                                      fontWeight: 800
                                    }}
                                  >
                                    Move {targetWall.label.split(" ")[0]}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
