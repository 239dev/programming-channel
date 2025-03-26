from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    # Create a new image with a light blue background
    image = Image.new('RGB', (size, size), color='lightblue')
    
    # Create a drawing context
    draw = ImageDraw.Draw(image)
    
    # Try to use a default system font
    try:
        font = ImageFont.truetype("arial.ttf", size=size//6)
    except IOError:
        font = ImageFont.load_default()
    
    # Draw text
    text = "CMPT 370"
    
    # Get text bbox for more accurate positioning
    bbox = draw.textbbox((0, 0), text, font=font)
    textwidth = bbox[2] - bbox[0]
    textheight = bbox[3] - bbox[1]
    
    x = (size - textwidth) / 2
    y = (size - textheight) / 2
    draw.text((x, y), text, fill='navy', font=font)
    
    # Save the image
    image.save(filename)

# Create icons
create_icon(192, r'c:\Users\2309d\OneDrive\Desktop\project\frontend\public\logo192.png')
create_icon(512, r'c:\Users\2309d\OneDrive\Desktop\project\frontend\public\logo512.png')

print("Icons created successfully!")
