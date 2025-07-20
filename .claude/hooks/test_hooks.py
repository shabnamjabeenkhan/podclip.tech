#!/usr/bin/env python3
"""
Test script for Claude Code hook handler
"""

import json
import subprocess
import sys
from pathlib import Path

def test_hook_event(event_type):
    """Test a specific hook event"""
    print(f"Testing {event_type} event...")
    
    # Create sample hook data
    test_data = {
        "session_id": "test-session-123",
        "event": event_type,
        "timestamp": "2025-07-18T10:00:00Z"
    }
    
    # Run the hook handler with test data
    hook_script = Path(__file__).parent / "hook_handler.py"
    
    try:
        result = subprocess.run(
            ["python3", str(hook_script)],
            input=json.dumps(test_data),
            text=True,
            capture_output=True,
            timeout=10
        )
        
        if result.returncode == 0:
            print(f"✅ {event_type} event test passed")
        else:
            print(f"❌ {event_type} event test failed: {result.stderr}")
            
    except subprocess.TimeoutExpired:
        print(f"⏰ {event_type} event test timed out")
    except Exception as e:
        print(f"❌ {event_type} event test error: {e}")

def main():
    """Run all hook tests"""
    print("Testing Claude Code hook handler...")
    print("=" * 50)
    
    # Test different event types
    test_hook_event("stop")
    test_hook_event("notification")
    test_hook_event("unknown")
    
    print("=" * 50)
    print("Testing complete!")
    
    # Check if log file was created
    log_file = Path(__file__).parent / "hook_handler.log"
    if log_file.exists():
        print(f"Log file created: {log_file}")
        print("Recent log entries:")
        with open(log_file, "r") as f:
            lines = f.readlines()
            for line in lines[-10:]:  # Show last 10 lines
                print(f"  {line.rstrip()}")

if __name__ == "__main__":
    main()