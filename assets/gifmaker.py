from PIL import Image

def extract_frames(spritesheet_path, frame_width, frame_height, num_columns, num_rows):
    """
    Extracts individual frames from a sprite sheet.
    
    Returns a list of Pillow Image objects.
    """
    spritesheet = Image.open(spritesheet_path)
    frames = []
    for row in range(num_rows):
        for col in range(num_columns):
            left   = col * frame_width
            upper  = row * frame_height
            right  = left + frame_width
            lower  = upper + frame_height
            box    = (left, upper, right, lower)
            frame  = spritesheet.crop(box)
            frames.append(frame)
    return frames


def create_pingpong_gif(frames, output_path, duration=100, loop=0):
    """
    Creates a ping-pong (back-and-forth) animated GIF.
    Forward:  0 → 1 → 2 → 3
    Backward:     2 → 1        (avoids duplicating start & end frames)
    """
    if not frames:
        print("No frames to create GIF.")
        return

    if len(frames) < 2:
        print("Need at least 2 frames for ping-pong effect. Falling back to normal playback.")
        pingpong_frames = frames
    else:
        # Forward: all frames
        forward = frames[:]
        # Backward: from second-last to second frame (inclusive)
        backward = frames[-2:0:-1]          # for 4 frames → [2, 1]

        pingpong_frames = forward + backward

        print(f"Ping-pong sequence built: {len(forward)} forward + "
              f"{len(backward)} backward = {len(pingpong_frames)} total frames")

    # Save as animated GIF
    pingpong_frames[0].save(
        output_path,
        save_all=True,
        append_images=pingpong_frames[1:],
        format="GIF",
        duration=duration,
        loop=loop,                # 0 = infinite
        disposal=2,               # recommended for clean sprite animation
        transparency=0            # optional: if your sprites have transparency
    )
    print(f"Successfully created ping-pong GIF → {output_path}")


# ────────────────────────────────────────────────
#                  CONFIGURATION
# ────────────────────────────────────────────────

SPRITESHEET_FILE = 'dude.png'
FRAME_WIDTH      = 63
FRAME_HEIGHT     = 74
NUM_COLUMNS      = 4
NUM_ROWS         = 1
OUTPUT_FILE      = 'dude_walk_pingpong.gif'
FRAME_DURATION   = 180          # ← try 120–250 ms for natural walk feel

# 1. Extract the 4 frames
frames = extract_frames(
    SPRITESHEET_FILE,
    FRAME_WIDTH,
    FRAME_HEIGHT,
    NUM_COLUMNS,
    NUM_ROWS
)

# 2. Create back-and-forth looping GIF
create_pingpong_gif(
    frames,
    OUTPUT_FILE,
    duration=FRAME_DURATION,
    loop=0
)