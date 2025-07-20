# Claude Code Sound Notifications

This directory contains a hook system that adds sound notifications to Claude Code, alerting you when:
- Claude finishes a task (pleasant ascending chime)
- Claude needs your confirmation/approval (two-tone doorbell sound)

## Files

- `hook_handler.py` - Main Python script that processes hook events and plays sounds
- `generate_sounds.py` - Script to generate the notification sound files
- `test_hooks.py` - Test script to verify the hook system works
- `sounds/` - Directory containing the generated WAV sound files
  - `task_complete.wav` - Played when Claude finishes a task
  - `user_needed.wav` - Played when Claude needs user confirmation

## Configuration

The hook system is configured in `settings.json` in the project root. The current configuration listens for:

- `stop` events - When Claude completes its task
- `notification` events - When Claude is waiting for user approval

## How It Works

1. Claude Code triggers hook events based on your `settings.json` configuration
2. The `hook_handler.py` script receives JSON data via stdin containing event information
3. Based on the event type, it plays the appropriate sound file
4. If sound files are missing, it falls back to system beep sounds

## Customization

### Adding New Sounds

1. Add new WAV files to the `sounds/` directory
2. Modify `hook_handler.py` to map events to your new sound files
3. You can regenerate the default sounds by running: `python3 generate_sounds.py`

### Adding New Events

To listen for additional Claude Code events, edit `settings.json` and add new hook configurations. Available events include:
- `pre-tool-use` - Before Claude uses any tool
- `post-tool-use` - After Claude uses any tool  
- `stop` - When Claude completes its task
- `notification` - When Claude needs user confirmation
- `pre-compact` - Before Claude compacts conversation history

### Troubleshooting

- Check `hook_handler.log` for debugging information and error messages
- Run `python3 test_hooks.py` to verify the system is working
- Ensure your system has audio capabilities and the appropriate audio players (`afplay` on macOS, `paplay` on Linux)

## System Requirements

- Python 3.x
- Audio playback capabilities
- macOS: Uses `afplay` (built-in)
- Linux: Uses `paplay` (usually available with PulseAudio)
- Windows: Uses PowerShell with Media.SoundPlayer

## Testing

Run the test script to verify everything is working:

```bash
python3 test_hooks.py
```

This will test different event types and show you if sounds are playing correctly.