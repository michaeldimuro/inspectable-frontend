#!/bin/bash
# Script to create placeholder assets for Expo app

# Create a simple 1x1 blue pixel PNG (valid PNG format)
# This is a base64 encoded 1x1 blue pixel PNG
BLUE_PIXEL="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

# Create icon.png (1024x1024)
echo "$BLUE_PIXEL" | base64 -d > icon.png

# Create adaptive-icon.png (1024x1024)
echo "$BLUE_PIXEL" | base64 -d > adaptive-icon.png

# Create splash.png (1242x2436)
echo "$BLUE_PIXEL" | base64 -d > splash.png

# Create favicon.png (48x48)
echo "$BLUE_PIXEL" | base64 -d > favicon.png

echo "✅ Placeholder assets created!"
echo "Note: These are minimal 1x1 pixel placeholders."
echo "Replace with actual images for production."


