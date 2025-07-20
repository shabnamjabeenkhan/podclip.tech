#!/usr/bin/env python3
"""
Claude Code Hook Handler for Sound Notifications

This script handles Claude Code hook events and plays appropriate sounds
to notify the user when Claude finishes tasks or needs confirmation.
"""

import json
import sys
import os
import subprocess
from pathlib import Path

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent
SOUNDS_DIR = SCRIPT_DIR / "sounds"

def log_hook_data(data):
    """Log hook data for debugging purposes"""
    log_file = SCRIPT_DIR / "hook_handler.log"
    with open(log_file, "a") as f:
        f.write(f"{json.dumps(data, indent=2)}\n\n")

def play_system_beep():
    """Play a system beep sound"""
    try:
        # Try different system beep methods based on OS
        if sys.platform == "darwin":  # macOS
            subprocess.run(["afplay", "/System/Library/Sounds/Ping.aiff"], 
                         check=False, capture_output=True)
        elif sys.platform.startswith("linux"):  # Linux
            subprocess.run(["paplay", "/usr/share/sounds/alsa/Front_Left.wav"], 
                         check=False, capture_output=True)
        else:  # Windows or fallback
            print("\a")  # ASCII bell character
    except Exception:
        # Fallback to ASCII bell
        print("\a")

def play_sound_file(filename):
    """Play a specific sound file"""
    sound_path = SOUNDS_DIR / filename
    if not sound_path.exists():
        play_system_beep()
        return
    
    try:
        if sys.platform == "darwin":  # macOS
            subprocess.run(["afplay", str(sound_path)], 
                         check=False, capture_output=True)
        elif sys.platform.startswith("linux"):  # Linux
            subprocess.run(["paplay", str(sound_path)], 
                         check=False, capture_output=True)
        else:  # Windows
            subprocess.run(["powershell", "-c", f"(New-Object Media.SoundPlayer '{sound_path}').PlaySync()"], 
                         check=False, capture_output=True)
    except Exception:
        play_system_beep()

def handle_hook_event(event_data):
    """Handle different types of hook events"""
    event_name = event_data.get("event", "")
    
    if event_name == "stop":
        # Claude has completed its task
        play_sound_file("task_complete.aiff")
        
    elif event_name == "notification":
        # Claude is waiting for user confirmation/approval
        play_sound_file("attention_needed.aiff")
        
    else:
        # For any other events, just use a subtle beep
        play_system_beep()

def main():
    """Main function to process hook data"""
    try:
        # Read JSON data from stdin
        input_data = sys.stdin.read()
        if not input_data.strip():
            return
            
        # Parse JSON
        hook_data = json.loads(input_data)
        
        # Log the data for debugging (optional)
        log_hook_data(hook_data)
        
        # Handle the event
        handle_hook_event(hook_data)
        
    except json.JSONDecodeError:
        # Invalid JSON, ignore silently
        pass
    except Exception as e:
        # Log error but don't fail
        with open(SCRIPT_DIR / "hook_handler.log", "a") as f:
            f.write(f"Error: {e}\n")

if __name__ == "__main__":
    main()