# Face Animation Integration - Implementation Guide

## Overview
This document describes the integration of face animation using the Replicate "Live Portrait" API to convert static avatar images into animated videos.

## How It Works

### 1. **Image Upscaling** (Existing)
- When a user joins, their avatar image is upscaled to HD using Real-ESRGAN
- The HD image is cached in `avatares_hd/` directory

### 2. **Face Animation** (New)
- After upscaling completes, the system attempts to animate the HD face image
- Uses Replicate's Live Portrait API: `fofr/live-portrait`
- Generates an MP4 video of the face with natural head movements
- If the image is not a face, the API fails silently and the static HD image is used as fallback
- Generated animations are cached in `avatares_video/` directory

### 3. **Cache Strategy**
- Both upscaled images and animations are cached per user
- In-memory cache prevents duplicate API calls during the same session
- File-based cache allows videos to be reused across sessions

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

This installs:
- `replicate` - API client for Replicate
- `dotenv` - Environment variable loader
- Other existing dependencies

### 2. Configure Environment
Create a `.env` file in the project root:
```
REPLICATE_API_TOKEN=your_token_here
```

Get your token from: https://replicate.com/account

**Important**: The `.env` file is in `.gitignore` and will never be committed.

### 3. Run the Server
```bash
npm start
```

## API Endpoints

### `/api/animate-face`
**Purpose**: Attempt to generate a face animation

**Query Parameters**:
- `url` (required) - URL or path to the HD image
- `id` (required) - User ID (sanitized to alphanumeric + underscore)

**Response**:
```json
{
  "status": "success",
  "videoUrl": "avatares_video/userid_hash.mp4"
}
```

or

```json
{
  "status": "skipped",
  "message": "Face animation not available"
}
```

**Notes**:
- Non-face images will return `skipped` status
- The endpoint runs asynchronously
- Failed attempts are cached to avoid repeated API calls

## File Structure

```
project/
├── face-animation.js          # Server-side animation module
├── server.js                  # Express server with API endpoints
├── .env                       # Environment config (not committed)
├── .env.example              # Template for .env
├── avatares_hd/              # Upscaled HD images
├── avatares_video/           # Generated animations (created on first use)
├── js/
│   └── app.js               # Client-side with animation integration
└── node_modules/            # Dependencies
```

## How Client-Side Integration Works

1. **User joins** → Avatar URL received
2. **`loadAvatar()` called** → Starts HD upscaling
3. **Upscaling completes** → `attemptFaceAnimation()` triggered
4. **Animation API called** → Video generated (or skipped if not a face)
5. **Video URL cached** → Stored in `faceAnimationCache`
6. **User object updated** → `pick.faceAnimationUrl` set if animation succeeds

## Usage in Game

Currently, the animated videos are:
- Generated and cached for future use
- Available via the `faceAnimationUrl` property on user objects
- Can be integrated into UI elements (profile avatars, leaderboard, etc.)

Future enhancements could include:
- Rendering animations on 2x2 blocks
- Using animations in popup cards
- Streaming animations to overlays

## Error Handling

The system gracefully handles failures:

| Scenario | Behavior |
|----------|----------|
| Image is not a face | Silent failure, uses HD image |
| API token missing | Feature disabled, uses HD image |
| Network error | Uses HD image, logs error |
| Replicate API timeout | Uses HD image, caches failure to avoid retry |
| Rate limit | Uses HD image, waits before next attempt |

## Performance Considerations

- **First call**: ~30-60 seconds (Replicate processing time)
- **Cached calls**: <100ms (local file system)
- **Background processing**: Non-blocking, doesn't freeze UI
- **Memory usage**: In-memory cache limited to ~100 entries per session

## Troubleshooting

### Videos not generating
1. Check `.env` file has valid `REPLICATE_API_TOKEN`
2. Verify `avatares_video/` directory is writable
3. Check browser console for errors
4. Check server logs for "[Face Animation]" messages

### API token issues
```bash
# Test token validity
curl -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
  https://api.replicate.com/v1/account
```

### Rate limiting
Replicate has usage limits. If hitting limits:
1. Space out animation requests
2. Cache more aggressively
3. Consider premium API tier

## Dependencies

- **replicate**: ^1.0.0 - Official Replicate API client
- **dotenv**: ^16.4.5 - Environment variable management
- **express**: ^4.21.0 - Web framework (existing)
- **Node.js**: >=18.0.0 - Runtime environment

## References

- Replicate Documentation: https://replicate.com/docs
- Live Portrait Model: https://replicate.com/fofr/live-portrait
- GitHub Issue/PR: Add link when creating PR

## Notes for Developers

- Replicate API calls count toward account usage/pricing
- Each animation takes ~30-60 seconds to generate
- Generated videos are ~5-15MB each
- Consider disk space for storing many animations
- Videos are MP4 format, compatible with HTML5 `<video>` tag
